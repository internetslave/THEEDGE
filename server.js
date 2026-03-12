import express from 'express';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const PORT      = process.env.PORT || 5000;
const ODDS_API_KEY      = process.env.ODDS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RACING_API_USER   = process.env.RACING_API_USER;
const RACING_API_PASS   = process.env.RACING_API_PASS;
const ODDS_BASE  = 'https://api.the-odds-api.com/v4';
const RACING_BASE = 'https://api.theracingapi.com/v1';
const AI_TTL     = 12 * 60 * 60 * 1000;

if (!ODDS_API_KEY)      console.error('⚠️  ODDS_API_KEY missing');
if (!ANTHROPIC_API_KEY) console.error('⚠️  ANTHROPIC_API_KEY missing');
if (!RACING_API_USER || !RACING_API_PASS) console.warn('⚠️  RACING_API_USER / RACING_API_PASS missing — will use generated racing data');

// ═══════════════════════════════════════════════════════════════════
// JSONBIN.IO — single bin stores all data as { users, bets, tipping, comps }
// BIN_ID is created once and stored as a Replit secret
// ═══════════════════════════════════════════════════════════════════
const JSONBIN_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

function httpsReq(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// In-memory store — loaded from JSONBin on startup, written back on every change
let store = { users: {}, bets: {}, tipping: { rounds: {}, results: {}, activeRound: null }, comps: { comps: {}, memberships: {} } };
let storeLoaded = false;

async function loadStore() {
  if (!JSONBIN_KEY || !JSONBIN_BIN_ID) {
    console.warn('⚠️  JSONBIN_KEY or JSONBIN_BIN_ID missing — using memory only');
    storeLoaded = true;
    return;
  }
  try {
    const r = await httpsReq({
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${JSONBIN_BIN_ID}/latest`,
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
    });
    console.log(`[loadStore] status=${r.status} length=${r.body.length}`);
    if (r.status === 200) {
      const data = JSON.parse(r.body);
      // Merge with defaults to handle missing keys
      store.users   = data.users   || {};
      store.bets    = data.bets    || {};
      store.tipping = data.tipping || { rounds: {}, results: {}, activeRound: null };
      store.comps   = data.comps   || { comps: {}, memberships: {} };
      console.log(`✅ Store loaded — ${Object.keys(store.users).length} users`);
    } else {
      console.error('[loadStore] bad status:', r.status, r.body.substring(0,100));
    }
  } catch(e) { console.error('loadStore error:', e.message); }
  storeLoaded = true;
}

async function saveStore() {
  if (!JSONBIN_KEY || !JSONBIN_BIN_ID) return;
  try {
    const body = JSON.stringify(store);
    await httpsReq({
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${JSONBIN_BIN_ID}`,
      method: 'PUT',
      headers: {
        'X-Master-Key': JSONBIN_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, body);
  } catch(e) { console.error('saveStore error:', e.message); }
}

// Simple getters/setters that work against in-memory store + persist
const getUsers   = async () => store.users;
const getBets    = async () => store.bets;
const getTipping = async () => store.tipping;
const getComps   = async () => store.comps;

const saveUsers   = async d => { store.users   = d; await saveStore(); };
const saveBets    = async d => { store.bets    = d; await saveStore(); };
const saveTipping = async d => { store.tipping = d; await saveStore(); };
const saveComps   = async d => { store.comps   = d; await saveStore(); };

const initBins = loadStore;



// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════
const sessions    = {};
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
const AVATARS = ['🎯','🔥','⚡','💰','🏆','🦊','🐆','🌟','🎲','🃏'];
const COLORS  = ['#f0b429','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#f97316','#e8314a','#00c85a','#f59e0b'];

function hashPin(pin, salt) { return crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex'); }
function genSalt()          { return crypto.randomBytes(16).toString('hex'); }
function genToken()         { return crypto.randomBytes(32).toString('hex'); }
function isFresh(cache, key, ttl) { return cache[key] && (Date.now() - cache[key].ts < ttl); }

function createSession(username) {
  const token = genToken();
  sessions[token] = { username, expires: Date.now() + SESSION_TTL };
  return token;
}
function getSession(token) {
  if (!token) return null;
  const s = sessions[token];
  if (!s) return null;
  if (Date.now() > s.expires) { delete sessions[token]; return null; }
  return s.username;
}
function authMiddleware(req, res, next) {
  // Only accept token from header — never from URL params (prevents logging in proxies/access logs)
  const username = getSession(req.headers['x-session-token']);
  if (!username) return res.status(401).json({ error: 'Not authenticated' });
  req.username = username;
  next();
}

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════
const rateLimitStore = new Map();

function makeRateLimit(maxReqs, windowMs, msg = 'Too many requests — try again shortly') {
  return (req, res, next) => {
    const ip  = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim();
    const now = Date.now();
    const key = `${ip}:${req.path}`;
    const rec = rateLimitStore.get(key) || { count: 0, start: now };
    if (now - rec.start > windowMs) { rec.count = 1; rec.start = now; }
    else rec.count++;
    rateLimitStore.set(key, rec);
    if (rec.count > maxReqs) {
      console.warn(`[rate-limit] ${ip} hit limit on ${req.path}`);
      return res.status(429).json({ error: msg });
    }
    next();
  };
}

// General API rate limit: 60 req/min per IP per endpoint
const rateLimit = makeRateLimit(60, 60_000);
// Strict auth rate limit: 10 attempts per 15 min — brute-force protection
const authRateLimit = makeRateLimit(10, 15 * 60_000, 'Too many attempts — wait 15 minutes');

// Periodically prune old entries so the map doesn't grow unbounded
setInterval(() => {
  const cutoff = Date.now() - 60 * 60_000;
  for (const [k, v] of rateLimitStore) { if (v.start < cutoff) rateLimitStore.delete(k); }
}, 10 * 60_000);

// ═══════════════════════════════════════════════════════════════════
// ODDS
// ═══════════════════════════════════════════════════════════════════
const oddsCache = {};
const ODDS_TTL  = 6 * 60 * 60 * 1000; // 6-hour cache — preserves API credits
let combinedOddsCache = { data: null, ts: 0 };
let oddsApiCreditsRemaining = null;  // tracked from response headers

// 1 credit per request — do NOT use multiple regions (each region = 1 extra credit)
const ALL_SPORTS = [
  { key: 'aussierules_afl',         label: 'afl',        regions: 'au' },
  { key: 'rugbyleague_nrl',          label: 'nrl',        regions: 'au' },
  { key: 'soccer_australia_aleague', label: 'soccer_al',  regions: 'au' },
  { key: 'soccer_epl',               label: 'soccer_epl', regions: 'au' },
  { key: 'mma_mixed_martial_arts',   label: 'ufc',        regions: 'au' },
  { key: 'boxing_boxing',            label: 'boxing',     regions: 'au' },
  { key: 'basketball_nba',           label: 'nba',        regions: 'us' }, // US bookmakers for NBA coverage
];

async function fetchOdds(sport, regions = 'au') {
  if (oddsCache[sport] && Date.now() - oddsCache[sport].ts < ODDS_TTL) return oddsCache[sport].data;
  const r = await fetch(`${ODDS_BASE}/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=${regions}&markets=h2h&oddsFormat=decimal`);
  if (!r.ok) throw new Error(`Odds API ${r.status}`);
  // Track remaining credits from headers
  const remaining = r.headers.get('x-requests-remaining');
  const used      = r.headers.get('x-requests-used');
  if (remaining !== null) {
    oddsApiCreditsRemaining = parseInt(remaining, 10);
    console.log(`[Odds API] credits used=${used} remaining=${remaining} sport=${sport}`);
  }
  const data = await r.json();
  oddsCache[sport] = { data, ts: Date.now() };
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllOdds() {
  if (combinedOddsCache.data && Date.now() - combinedOddsCache.ts < ODDS_TTL) return combinedOddsCache.data;
  const results = {};
  for (let i = 0; i < ALL_SPORTS.length; i++) {
    const s = ALL_SPORTS[i];
    // Skip delay for first sport; 300ms gap between requests prevents 429 rate-limiting
    if (i > 0) await sleep(300);
    try { results[s.label] = await fetchOdds(s.key, s.regions || 'au'); }
    catch (e) { console.error(`Odds fetch failed [${s.key}]:`, e.message); results[s.label] = oddsCache[s.key]?.data || []; }
  }
  combinedOddsCache = { data: results, ts: Date.now() };
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// RACING DATA — The Racing API (theracingapi.com) + fallback generator
// ═══════════════════════════════════════════════════════════════════
const RACING_TTL = 15 * 60 * 1000;
let racingCache = { data: null, ts: 0 };

function racingAuthHeader() {
  return 'Basic ' + Buffer.from(`${RACING_API_USER}:${RACING_API_PASS}`).toString('base64');
}

async function fetchRacingAPI(endpoint) {
  const r = await fetch(`${RACING_BASE}${endpoint}`, {
    headers: { 'Authorization': racingAuthHeader() }
  });
  if (!r.ok) throw new Error(`Racing API ${r.status}: ${r.statusText}`);
  return r.json();
}

async function fetchRealRacingData() {
  if (racingCache.data && Date.now() - racingCache.ts < RACING_TTL) return racingCache.data;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [meetsToday, meetsTomorrow] = await Promise.all([
    fetchRacingAPI(`/australia/meets?date=${today}`),
    fetchRacingAPI(`/australia/meets?date=${tomorrow}`)
  ]);

  const allMeets = [...(meetsToday.meets || []), ...(meetsTomorrow.meets || [])];
  const events = [];

  const racePromises = allMeets.slice(0, 12).map(async (meet) => {
    try {
      const raceData = await fetchRacingAPI(`/australia/meets/${meet.meet_id}/races`);
      return { meet, races: raceData.races || [] };
    } catch (e) {
      console.error(`Racing API: failed to fetch races for ${meet.course}:`, e.message);
      return { meet, races: [] };
    }
  });

  const meetResults = await Promise.all(racePromises);

  for (const { meet, races } of meetResults) {
    for (const race of races) {
      if (race.is_trial || race.is_jump_out) continue;
      if (!race.runners?.length) continue;

      const runners = race.runners
        .filter(r => r.horse && r.scratched !== 'true' && r.scratched !== true)
        .map(r => {
          const bestOdds = r.odds?.reduce((best, o) => {
            const w = parseFloat(o.win_odds);
            return (!isNaN(w) && w > 0 && (best === null || w < best)) ? w : best;
          }, null) || null;
          return {
            name: r.horse,
            odds: bestOdds || 99,
            barrier: parseInt(r.draw) || 0,
            jockey: r.jockey || '',
            trainer: r.trainer || '',
            form: r.form || '',
            weight: r.weight || '',
            age: r.age || '',
            silk: r.silk_url || null
          };
        })
        .sort((a, b) => a.odds - b.odds);

      if (runners.length < 2) continue;

      const distStr = race.distance || '';
      const distNum = parseInt(distStr.replace(/[^0-9]/g, '')) || 0;
      const raceNum = parseInt(race.race_number) || 0;

      events.push({
        id: `racing_${meet.meet_id}_R${raceNum}`,
        sport_key: 'horse_racing_au',
        home_team: runners[0].name,
        away_team: `R${raceNum} ${meet.course}`,
        commence_time: race.off_time || `${race.date}T00:00:00.000Z`,
        venue: meet.course,
        state: meet.state || '',
        comp: race.class || race.race_group || 'Race',
        raceName: race.race_name || '',
        distance: distNum,
        distanceLabel: distStr,
        raceNumber: raceNum,
        runners,
        going: race.going || '',
        prizeTotal: race.prize_total || '',
        isRacing: true,
        isLiveData: true
      });
    }
  }

  events.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
  racingCache = { data: events, ts: Date.now() };
  console.log(`Racing API: fetched ${events.length} races from ${allMeets.length} meets`);
  return events;
}

// ── Fallback: generated racing data when API credentials are not configured ──
const FALLBACK_VENUES = {
  greyhound: [
    { name: 'Sandown Park', state: 'VIC' }, { name: 'The Meadows', state: 'VIC' },
    { name: 'Wentworth Park', state: 'NSW' }, { name: 'Albion Park', state: 'QLD' },
    { name: 'Cannington', state: 'WA' }, { name: 'Angle Park', state: 'SA' }
  ],
  horse: [
    { name: 'Flemington', state: 'VIC' }, { name: 'Randwick', state: 'NSW' },
    { name: 'Eagle Farm', state: 'QLD' }, { name: 'Moonee Valley', state: 'VIC' },
    { name: 'Rosehill', state: 'NSW' }, { name: 'Caulfield', state: 'VIC' }
  ]
};
const FALLBACK_NAMES = {
  greyhound: [
    'Midnight Storm','Flying Ace','Blazing Speed','Cool Operator','Star Chaser','Thunder Roll',
    'Shadow Express','Fast Lane','Rapid Fire','Dark Comet','Lucky Strike','Jet Stream',
    'Wild Card','Bold Move','Iron Will','Swift Justice','Prime Time','Hot Shot',
    'Cash Flow','Power Play','Silver Bullet','Gold Rush','Night Hawk','Storm Chaser',
    'Quick Draw','Top Notch','Fire Ball','Blue Diamond','Red Arrow','Flash Point',
    'Aston Bolero','Fernando Mick','Bella Stellina','Zipping Lad','Shima Shine',
    'My Redeemer','Tornado Tears','Fanta Bale','Dyna Patty','Mystic Riot'
  ],
  horse: [
    'Northern Meteor','Southern Cross','Golden Slipper','Diamond Rain','Storm Rider','Royal Flush',
    'Midnight Run','Silver Lining','Thunder Bay','Crystal Clear','Iron Horse','Phoenix Rising',
    'River Dance','Ocean King','Mountain Peak','Desert Storm','Valley Girl','Harbour Bridge',
    'Autumn Gold','Spring Tide','Winter Star','Summer Breeze','Sunset Strip','Dawn Patrol',
    'Celtic Prince','Viking Warrior','Roman Empire','Spartan Hero','Trojan Star','Persian King',
    'Winx Legacy','Phar Lap Ghost','Tulloch Road','Makybe Star','Octagonal Lad','Sunline Spirit',
    'Kingston Rule','Carbine Prince','Bernborough Gold','Lonhro Bay','Saintly Son','Might And Power'
  ]
};
const FALLBACK_JOCKEYS = {
  horse: ['J. McDonald','D. Lane','J. Bowman','C. Williams','K. McEvoy','D. Oliver','M. Zahra','R. Moore','B. Melham','H. Bowman','T. Marquand','J. McNeil','W. Pike','C. Newitt','L. Currie','B. Avdulla','R. Dolan','N. Rawiller','G. Boss','S. Clipperton'],
  greyhound: []
};
const FALLBACK_TRAINERS = {
  horse: ['C. Waller','G. Waterhouse','J. Cummings','L. Freedman','D. Hayes','T. Busuttin','M. Price','C. Maher','A. Neasham','P. Moody','B. Laming','K. Lees','M. Smith','R. Quinton','J. Thompson','M. Newnham'],
  greyhound: ['J. Bale','G. Hall','R. Britton','A. Dailly','S. Karakatsanis','M. Delbridge','B. Azzopardi','D. Geall','P. Enright','K. Greenough','T. Dailly','A. Gibbons']
};
const FALLBACK_COMPS = {
  greyhound: ['Maiden','Grade 5','Grade 4','Free For All','Listed Race','Group 3','Novice','Mixed 4/5'],
  horse: ['Maiden Plate','Benchmark 72','Benchmark 82','Class 3 Handicap','Listed Race','Group 3','Benchmark 64','Class 1','Open Handicap','Group 2']
};
const FALLBACK_RACE_NAMES = {
  horse: ['','','','Tab Highway','Everest Carnival','Winter Challenge','Provincial Cup','Country Classic','Inglis Sprint','Civic Stakes','Tramway Handicap','Show County Quality','Ajax Stakes','Canterbury Cup','Epsom Preview'],
  greyhound: ['','','','Sandown Cup Heats','Speed Star','Bold Trease','Melbourne Cup Heats','Topgun','National Sprint','Silver Chief','Harrison-Dawson','Zoom Top']
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateForm(rng) {
  const chars = ['1','2','3','4','5','6','7','8','x'];
  return Array.from({length:5}, () => chars[Math.floor(rng() * chars.length)]).join('');
}

function generateCareer(rng) {
  const starts = 8 + Math.floor(rng() * 40);
  const winRate = 0.08 + rng() * 0.35;
  const placeRate = 0.12 + rng() * 0.25;
  const wins = Math.max(0, Math.round(starts * winRate));
  const places = Math.max(0, Math.round(starts * placeRate));
  return { starts, wins, places, earnings: Math.round((wins * 25000 + places * 8000 + starts * 1200) * (0.5 + rng())) };
}

function generateOddsMovement(rng, currentOdds) {
  const shift = (rng() - 0.5) * 0.4;
  const openOdds = Math.max(1.2, currentOdds * (1 + shift));
  return { open: Math.round(openOdds * 100) / 100, current: currentOdds };
}

function generateRacingData(type) {
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / (6 * 60 * 60 * 1000));
  const windowStart = new Date(daySeed * 6 * 60 * 60 * 1000);
  const rng = seededRandom(daySeed + (type === 'horse' ? 7777 : 3333));
  const venues = FALLBACK_VENUES[type];
  const names = FALLBACK_NAMES[type];
  const comps = FALLBACK_COMPS[type];
  const jockeys = FALLBACK_JOCKEYS[type];
  const trainers = FALLBACK_TRAINERS[type];
  const raceNames = FALLBACK_RACE_NAMES[type];
  const goingOptions = ['Good 3','Good 4','Soft 5','Soft 6','Soft 7','Heavy 8','Heavy 9','Firm 1','Firm 2'];
  const events = [];
  const numVenues = 3 + Math.floor(rng() * 3);
  const usedVenues = [];
  for (let v = 0; v < numVenues; v++) {
    const venue = venues[Math.floor(rng() * venues.length)];
    if (usedVenues.includes(venue.name)) continue;
    usedVenues.push(venue.name);
    const numRaces = 6 + Math.floor(rng() * 4);
    const venueGoing = goingOptions[Math.floor(rng() * goingOptions.length)];
    for (let r = 0; r < numRaces; r++) {
      const hoursAhead = 0.5 + rng() * 48;
      const raceTime = new Date(windowStart.getTime() + hoursAhead * 3600000);
      const numRunners = type === 'greyhound' ? 8 : (8 + Math.floor(rng() * 8));
      const runners = [];
      const usedNames = new Set();
      const usedJockeys = new Set();
      for (let i = 0; i < numRunners; i++) {
        let name;
        do { name = names[Math.floor(rng() * names.length)]; } while (usedNames.has(name));
        usedNames.add(name);
        const baseOdds = Math.round((1.5 + rng() * 20) * 100) / 100;
        let jockey = '';
        if (jockeys.length) {
          do { jockey = jockeys[Math.floor(rng() * jockeys.length)]; } while (usedJockeys.has(jockey) && usedJockeys.size < jockeys.length);
          usedJockeys.add(jockey);
        }
        const trainer = trainers[Math.floor(rng() * trainers.length)];
        const form = generateForm(rng);
        const career = generateCareer(rng);
        const oddsMovement = generateOddsMovement(rng, baseOdds);
        const weight = type === 'horse' ? (52 + Math.round(rng() * 9 * 10) / 10) : '';
        const age = type === 'horse' ? (2 + Math.floor(rng() * 6)) + 'yo' : (1 + Math.floor(rng() * 4)) + 'yo';
        const daysSinceRun = 5 + Math.floor(rng() * 50);
        const last5 = form.split('').map(c => c === 'x' ? 'L' : parseInt(c) <= 3 ? (parseInt(c) === 1 ? 'W' : 'P') : 'L');
        runners.push({
          name, odds: baseOdds, barrier: i + 1,
          jockey, trainer, form, weight,
          age, daysSinceRun,
          last5: last5.join('-'),
          career: `${career.starts}: ${career.wins}-${career.places}-${career.starts - career.wins - career.places}`,
          careerEarnings: career.earnings,
          oddsOpen: oddsMovement.open
        });
      }
      runners.sort((a, b) => a.odds - b.odds);
      const distance = type === 'greyhound' ? [315,395,515,595,715][Math.floor(rng()*5)] : [1000,1100,1200,1400,1600,2000,2400,3200][Math.floor(rng()*8)];
      const raceName = raceNames[Math.floor(rng() * raceNames.length)];
      const prize = type === 'horse' ? (25000 + Math.floor(rng() * 475000)) : (5000 + Math.floor(rng() * 70000));
      events.push({
        id: `${type}_${venue.name.replace(/\s/g,'')}_R${r+1}_${daySeed}`,
        sport_key: type === 'horse' ? 'horse_racing_au' : 'greyhound_racing_au',
        home_team: runners[0].name,
        away_team: `${numRunners} runners`,
        commence_time: raceTime.toISOString(),
        venue: venue.name, state: venue.state,
        comp: comps[Math.floor(rng() * comps.length)],
        raceName: raceName || '',
        distance, distanceLabel: `${distance}m`,
        raceNumber: r + 1, runners, isRacing: true, isLiveData: false,
        going: venueGoing,
        prizeTotal: prize
      });
    }
  }
  return events.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
}

async function getRacingEvents() {
  let horseEvents;
  if (RACING_API_USER && RACING_API_PASS) {
    try {
      horseEvents = await fetchRealRacingData();
      if (!horseEvents.length) {
        console.warn('Racing API returned no events, using horse fallback');
        horseEvents = generateRacingData('horse');
      }
    } catch (e) {
      console.error('Racing API failed, using horse fallback:', e.message);
      horseEvents = generateRacingData('horse');
    }
  } else {
    horseEvents = generateRacingData('horse');
  }
  const greyhoundEvents = generateRacingData('greyhound');
  return [...horseEvents, ...greyhoundEvents];
}

// ═══════════════════════════════════════════════════════════════════
// AI ANALYSIS
// ═══════════════════════════════════════════════════════════════════
const aiCache = {};
const aiQueue = [];
let aiBusy = false;

function getSportContext(sport) {
  const contexts = {
    'NBA': `NBA SPECIFIC CONTEXT — Key factors to analyse:
- Pace & efficiency: offensive/defensive rating, points per 100 possessions
- Home court advantage (NBA teams historically win ~60% at home)
- Back-to-back games and rest days (huge impact — teams on 0 rest days lose ~5% more)
- Star player availability & load management (top-5 players on each team are decisive)
- Recent 3-point shooting efficiency (hot/cold shooting streaks)
- Paint dominance vs perimeter attack matchup
- Referee tendencies (foul rate impact on star players)
- Conference record and divisional familiarity
- Clutch performance: record in games within 5 points in final 5 minutes
Use NBA stat terminology: PPG, APG, RPG, eFG%, TS%, Net Rating, +/-.
Reference current season stats and recent form from 2024-25 NBA season.`,
    'AFL': `AFL SPECIFIC CONTEXT — Key factors to analyse:
- Clearance differential (most predictive AFL stat)
- Contested possessions and inside 50s
- Interstate travel fatigue (WAFL, Queensland teams)
- MCG specialists vs away records
- Key position matchups: tall forwards vs backlines
- Weather conditions (wind/rain heavily affects scoring)
- Recent scoring: average score and opponent average score conceded
Use AFL stat terminology: disposals, handballs, kicks, marks, clearances, inside 50s.`,
    'NRL': `NRL SPECIFIC CONTEXT — Key factors to analyse:
- Completion rate and error count (critical in NRL)
- Post-State of Origin player fatigue/absence
- Home ground advantage (NRL is highly home-ground dependent)
- Key playmaker availability (halfback/five-eighth)
- Defensive line speed and completion rate
- Penalties and discipline
- NSWRL vs QRL representative commitments
Use NRL stat terminology: tries, line breaks, tackles made, errors, penalties.`,
    'Soccer': `SOCCER SPECIFIC CONTEXT — Key factors to analyse:
- Clean sheet probability and defensive record
- Head-to-head at this specific venue
- Squad rotation and Europa/Champions League fatigue
- xG (expected goals) vs actual goals — is form sustainable?
- Set piece efficiency (corners, free kicks)
- Manager tactical matchup
- Home/away splits are dramatic in soccer
Use soccer analytics: xG, xGA, PPDA, possession %, shots on target.`,
    'UFC': `UFC/MMA SPECIFIC CONTEXT — Key factors to analyse:
- Striking accuracy and takedown defence %
- Finish rate and method of victory tendencies
- Recent performance bonus history (activity/aggression)
- Camp and gym (training partner quality)
- Weight cut history and late notice replacements
- Reach and physical advantages
- Judges tendencies at this venue
Use MMA stats: significant strikes per minute, takedown %, submission attempts.`,
    'Boxing': `BOXING SPECIFIC CONTEXT — Key factors to analyse:
- Power punching vs volume punching styles
- KO/TKO rate and chin durability
- Ring rust (time away from boxing)
- Promotional politics and judge bias concerns
- Weight class move history
- Trainer pedigree and camp quality
Use boxing stats: punches landed per round, knockdown ratio, reach, southpaw/orthodox matchup.`,
  };
  return contexts[sport] || '';
}

async function analyseMatch(ev) {
  if (!ANTHROPIC_API_KEY) return null;
  if (isFresh(aiCache, ev.id, AI_TTL)) return aiCache[ev.id].data;
  try {
    const home = ev.home, away = ev.away, sport = ev.sport;
    const oddsLine = `${home} @ ${ev.homeOdds}, ${away} @ ${ev.awayOdds}${ev.drawOdds ? `, Draw @ ${ev.drawOdds}` : ''}`;
    const recOptions = ev.drawOdds ? `"${home}", "${away}", or "Draw"` : `"${home}" or "${away}"`;
    const sportCtx = getSportContext(sport);

    const prompt = `You are a sharp sports betting analyst covering Australian and international markets. Analyse this match and return ONLY a JSON object — no markdown, no explanation outside the JSON.

MATCH: ${home} vs ${away}
SPORT: ${sport}
ODDS: ${oddsLine}
${sportCtx ? `\n${sportCtx}\n` : ''}
Draw on your knowledge of these teams/competitions to produce SPECIFIC, REALISTIC analysis. Use real team form, real head-to-head history, real venue stats, real injury context, real betting patterns. Be specific — use actual numbers, scorelines, and player names where you know them.

Return this exact JSON structure with ALL fields filled in:

{
  "recommendation": <one of ${recOptions}>,
  "confidence": <integer 50-95>,
  "valueBet": <true if the recommended team's odds represent genuine value, false otherwise>,
  "summary": "<2-3 sentence punchy verdict that explains WHY this is the pick, referencing specific form or stats>",
  "form": {
    "home": "<${home} last 5 results e.g. W W L W W — with a specific note about their current momentum, scoring avg, or key players>",
    "away": "<${away} last 5 results e.g. L W W L W — with a specific note about their current momentum, scoring avg, or key players>"
  },
  "headToHead": "<Specific H2H record between these teams, e.g. '${home} have won 7 of the last 10 meetings. They won the most recent clash 22-14 in Round 18 last season.' Include actual recent results if known.>",
  "venueEdge": "<Specific venue/home court advantage or disadvantage, referencing the actual arena/stadium, home record this season, and any travel/scheduling factors for ${away}>",
  "keyFactors": [
    {"icon": "⚡", "label": "Key Reason", "value": "<The single most decisive factor — use sport-specific stats and player names>"},
    {"icon": "📊", "label": "Form Edge", "value": "<Specific form stat with numbers — scoring averages, recent results, efficiency metrics>"},
    {"icon": "🏟️", "label": "Venue / Schedule", "value": "<Home court/ground advantage with specific record, and any back-to-back or travel fatigue>"},
    {"icon": "⚠️", "label": "Risk", "value": "<Main risk to the pick — injury, player availability, hot opponent form, or statistical anomaly>"}
  ],
  "bettingAngle": "<One sharp betting insight referencing the specific odds above — e.g. line value, market inefficiency, or why the favourite/underdog price is correct or incorrect given specific stats.>"
}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1100, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    if (data.error) {
      const msg = data.error?.message || JSON.stringify(data.error);
      console.error('Anthropic error:', msg);
      if (msg.includes('credit') || msg.includes('billing')) {
        return { _error: 'credits', message: 'AI credits exhausted — top up at console.anthropic.com' };
      }
      return null;
    }
    const raw = data.content?.[0]?.text || '';
    // Extract JSON — handle both bare JSON and markdown-wrapped
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw.replace(/```json|```/g,'').trim());
    aiCache[ev.id] = { data: analysis, ts: Date.now() };
    console.log(`[AI] analysed ${home} vs ${away} — conf:${analysis.confidence}% pick:${analysis.recommendation}`);
    return analysis;
  } catch (err) { console.error(`AI failed for ${ev.home} vs ${ev.away}:`, err.message); return null; }
}

// Background pre-analysis disabled — on-demand only (saves API credits)
function queueAIAnalysis(events) { /* no-op */ }

// ═══════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://replit.com https://*.replit.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.anthropic.com https://api.the-odds-api.com https://api.open-meteo.com;"
  );
  next();
});

const ALLOWED_ORIGINS = new Set([
  'https://edgebets.net', 'https://www.edgebets.net',
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin
    || ALLOWED_ORIGINS.has(origin)
    || origin.endsWith('.replit.app')
    || origin.endsWith('.repl.co')
    || origin.includes('localhost');
  if (isAllowed) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-token');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── AUTH ──
app.post('/api/auth/signup', authRateLimit, async (req, res) => {
  let { username, pin, sport, email } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  username = username.toLowerCase().trim();
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: 'Username must be 2-20 characters' });
  if (!/^[a-z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Letters, numbers and underscores only' });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  if (email && email.length > 200) return res.status(400).json({ error: 'Email too long' });
  const users = await getUsers();
  if (users[username]) return res.status(409).json({ error: 'Username already taken' });
  const salt = genSalt(), pinHash = hashPin(pin, salt);
  const idx  = Object.keys(users).length % AVATARS.length;
  users[username] = { pinHash, salt, sport: sport || 'AFL', avatar: AVATARS[idx], color: COLORS[idx], email: (email || '').trim().toLowerCase().substring(0, 200), createdAt: Date.now() };
  await saveUsers(users);
  const bets = await getBets();
  bets[username] = [];
  await saveBets(bets);
  const token = createSession(username);
  res.json({ success: true, token, profile: { username, avatar: users[username].avatar, color: users[username].color, sport: users[username].sport } });
});

app.post('/api/auth/signin', authRateLimit, async (req, res) => {
  let { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  username = username.toLowerCase().trim();
  if (username.length > 20) return res.status(400).json({ error: 'Invalid credentials' });
  const users = await getUsers();
  const user  = users[username];
  // Always run hashPin even if user not found — prevents timing-based enumeration
  const dummySalt = 'ffffffffffffffffffffffffffffffff';
  const provided  = hashPin(String(pin).substring(0, 10), user ? user.salt : dummySalt);
  if (!user || provided !== user.pinHash) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }
  const token = createSession(username);
  res.json({ success: true, token, profile: { username, avatar: user.avatar, color: user.color, sport: user.sport } });
});

app.post('/api/auth/reset-pin', authRateLimit, async (req, res) => {
  let { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Username and email required' });
  username = username.toLowerCase().trim();
  if (username.length > 20) return res.status(400).json({ error: 'No account found with those details' });
  email    = email.trim().toLowerCase();
  const users = await getUsers();
  const user  = users[username];
  // Always return same message to prevent user+email enumeration
  if (!user || !user.email || user.email !== email) {
    return res.status(200).json({ success: true, message: 'If that account exists, your new PIN has been generated.' });
  }
  const newPin = String(Math.floor(1000 + Math.random() * 9000));
  const salt   = genSalt();
  user.pinHash = hashPin(newPin, salt);
  user.salt    = salt;
  users[username] = user;
  await saveUsers(users);
  res.json({ success: true, newPin });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const users = await getUsers();
  const user  = users[req.username];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ username: req.username, avatar: user.avatar, color: user.color, sport: user.sport });
});

app.post('/api/auth/signout', authMiddleware, (req, res) => {
  delete sessions[req.headers['x-session-token']];
  res.json({ success: true });
});

// ── BETS ──
app.get('/api/bets', authMiddleware, async (req, res) => {
  const bets = await getBets();
  res.json({ success: true, bets: bets[req.username] || [] });
});

const VALID_RESULTS  = new Set(['win', 'loss', 'push', 'pending']);
const VALID_SPORTS   = new Set(['AFL', 'NRL', 'NBA', 'Soccer', 'UFC', 'Boxing', 'Horse Racing', 'Greyhound', 'Other']);
const MAX_BETS       = 500;

app.post('/api/bets', authMiddleware, async (req, res) => {
  const { bets: newBets } = req.body;
  if (!Array.isArray(newBets)) return res.status(400).json({ error: 'bets must be an array' });
  if (newBets.length > MAX_BETS) return res.status(400).json({ error: `Maximum ${MAX_BETS} bets` });
  const clean = newBets.map(b => {
    if (!b || typeof b !== 'object') return null;
    const stake  = Math.max(0, Math.min(1_000_000, Number(b.stake)  || 0));
    const odds   = Math.max(1, Math.min(1000,      Number(b.odds)   || 1));
    const result = VALID_RESULTS.has(b.result) ? b.result : 'pending';
    return {
      id:        String(b.id   || '').substring(0, 64),
      match:     String(b.match || '').substring(0, 120),
      team:      String(b.team  || '').substring(0, 60),
      sport:     VALID_SPORTS.has(b.sport) ? b.sport : 'Other',
      stake, odds, result,
      date:      typeof b.date === 'string' ? b.date.substring(0, 30) : new Date().toISOString(),
      label:     String(b.label || '').substring(0, 120),
      notes:     String(b.notes || '').substring(0, 300),
    };
  }).filter(Boolean);
  const bets = await getBets();
  bets[req.username] = clean;
  await saveBets(bets);
  res.json({ success: true });
});

// ── LEADERBOARD ──
app.get('/api/leaderboard', async (req, res) => {
  const users = await getUsers();
  const bets  = await getBets();
  const entries = Object.keys(users).map(u => {
    const userBets = bets[u] || [];
    // Only expose aggregate stats — never the raw bet array
    const settled = userBets.filter(b => b.result && b.result !== 'pending');
    const wins    = settled.filter(b => b.result === 'win').length;
    const totalStake  = settled.reduce((s, b) => s + (Number(b.stake) || 0), 0);
    const totalReturn = settled.filter(b => b.result === 'win').reduce((s, b) => s + ((Number(b.stake) || 0) * (Number(b.odds) || 1)), 0);
    return {
      username: u,
      avatar:   users[u].avatar,
      color:    users[u].color,
      totalBets: userBets.length,
      settled:   settled.length,
      wins,
      losses:    settled.length - wins,
      winRate:   settled.length ? Math.round((wins / settled.length) * 100) : 0,
      totalStake: Math.round(totalStake * 100) / 100,
      roi: totalStake > 0 ? Math.round(((totalReturn - totalStake) / totalStake) * 1000) / 10 : 0,
      // Include last 5 bet results only (no amounts, no match details) for leaderboard display
      recentResults: userBets.slice(-5).map(b => b.result || 'pending'),
    };
  });
  res.json({ success: true, entries });
});

// ── ODDS ──
app.get('/api/odds', rateLimit, async (req, res) => {
  try {
    const raw = await fetchAllOdds();
    const sportLabels = { afl:'AFL', nrl:'NRL', soccer_al:'Soccer', soccer_epl:'Soccer', ufc:'UFC', boxing:'Boxing', nba:'NBA' };
    const events = [];
    for (const [key, evList] of Object.entries(raw)) {
      for (const ev of (evList || [])) {
        const h2h  = ev.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h');
        if (!h2h) continue;
        const home = h2h.outcomes.find(o => o.name === ev.home_team);
        const away = h2h.outcomes.find(o => o.name === ev.away_team);
        const draw = h2h.outcomes.find(o => o.name === 'Draw');
        if (!home || !away) continue;
        const aiData = aiCache[ev.id]?.data || null;
        events.push({ id: ev.id, sport: sportLabels[key] || key, home: ev.home_team, away: ev.away_team, homeOdds: home.price, awayOdds: away.price, drawOdds: draw?.price || null, commenceTime: ev.commence_time, aiReady: !!aiData, ...(aiData || {}) });
      }
    }

    const racingEvents = await getRacingEvents();
    for (const ev of racingEvents) {
      const fav = ev.runners[0];
      const racingSport = ev.sport_key === 'greyhound_racing_au' ? 'Greyhound' : 'Horse Racing';
      events.push({
        id: ev.id, sport: racingSport, home: fav.name, away: `R${ev.raceNumber} ${ev.venue}`,
        homeOdds: fav.odds, awayOdds: ev.runners[1]?.odds || null, drawOdds: null,
        commenceTime: ev.commence_time, aiReady: false,
        venue: ev.venue, comp: ev.comp, distance: ev.distance,
        distanceLabel: ev.distanceLabel || `${ev.distance}m`,
        raceNumber: ev.raceNumber, runners: ev.runners, isRacing: true,
        isLiveData: ev.isLiveData || false,
        raceName: ev.raceName || '', going: ev.going || '', prizeTotal: ev.prizeTotal || '',
        state: ev.state || ''
      });
    }

    queueAIAnalysis(events.filter(e => !e.aiReady && !e.isRacing));
    const cacheAge = combinedOddsCache.ts ? Math.round((Date.now() - combinedOddsCache.ts) / 1000) : 0;
    const nextRefresh = Math.max(0, Math.round((ODDS_TTL - (Date.now() - combinedOddsCache.ts)) / 1000));
    res.json({ success: true, events, cacheAge, nextRefresh, cacheTTL: ODDS_TTL / 1000, creditsRemaining: oddsApiCreditsRemaining });
  } catch (e) { console.error('Odds error:', e); res.status(500).json({ success: false, error: 'Failed to fetch odds' }); }
});

// ── ODDS CREDIT USAGE STATUS (no API call — reads cache only) ──
app.get('/api/odds/usage', (req, res) => {
  const cacheAge   = combinedOddsCache.ts ? Math.round((Date.now() - combinedOddsCache.ts) / 1000) : null;
  const nextRefresh = cacheAge !== null ? Math.max(0, Math.round((ODDS_TTL / 1000) - cacheAge)) : 0;
  res.json({
    creditsRemaining: oddsApiCreditsRemaining,
    cacheAge,
    nextRefresh,
    cacheTTLHours: ODDS_TTL / 3600000,
    hasCachedData: !!combinedOddsCache.data
  });
});

// ── AI ANALYSE ──
app.post('/api/analyse', rateLimit, authMiddleware, async (req, res) => {
  const { event } = req.body;
  if (!event?.id) return res.status(400).json({ success: false, error: 'Event data required' });
  try {
    if (isFresh(aiCache, event.id, AI_TTL)) return res.json({ success: true, analysis: aiCache[event.id].data });
    const analysis = await analyseMatch(event);
    if (!analysis) return res.status(503).json({ success: false, error: 'AI unavailable' });
    if (analysis._error) return res.status(402).json({ success: false, errorType: analysis._error, error: analysis.message });
    res.json({ success: true, analysis });
  } catch { res.status(500).json({ success: false, error: 'Analysis failed' }); }
});

// ── HEALTH — public minimal ping only ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
// TIPPING
// ═══════════════════════════════════════════════════════════════════
function generateCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }

function scoreOnePick(pick, result) {
  if (!result || result.status !== 'final') return null;
  let pts = 0;
  const correct = pick.tip === result.winner;
  if (correct) {
    pts += 1;
    if (pick.confidence) pts += Math.round((pick.confidence / 8) * 4 * 10) / 10;
    if (pick.margin != null && result.margin != null) {
      const diff = Math.abs(pick.margin - result.margin);
      if (diff === 0) pts += 5; else if (diff <= 6) pts += 2; else if (diff <= 12) pts += 1;
    }
  }
  if (pick.banker) pts *= 2;
  return { pts: Math.round(pts * 10) / 10, correct };
}

app.get('/api/tipping/fixtures', async (req, res) => {
  const t = await getTipping();
  if (!t.activeRound || !t.rounds[t.activeRound]) return res.json({ round: null, lockout: null, fixtures: [] });
  const rd = t.rounds[t.activeRound];
  res.json({ round: t.activeRound, lockout: rd.lockout || null, fixtures: rd.fixtures || [] });
});

app.get('/api/tipping/my-tips', authMiddleware, async (req, res) => {
  const t = await getTipping();
  const tips = t.activeRound ? (t.results[t.activeRound] || {})[req.username] || {} : {};
  res.json({ round: t.activeRound, tips });
});

app.post('/api/tipping/submit', authMiddleware, async (req, res) => {
  const { tips } = req.body;
  if (!tips || typeof tips !== 'object') return res.status(400).json({ error: 'Invalid tips' });
  const t = await getTipping();
  if (!t.activeRound) return res.status(400).json({ error: 'No active round' });
  const rd = t.rounds[t.activeRound];
  if (rd.lockout && new Date() > new Date(rd.lockout)) return res.status(400).json({ error: 'Round has locked out' });
  const validIds = new Set((rd.fixtures || []).map(f => f.id));
  const clean = {};
  for (const [id, tip] of Object.entries(tips)) {
    if (!validIds.has(id) || !tip.tip) continue;
    clean[id] = { tip: String(tip.tip).substring(0,100), margin: tip.margin != null ? Math.max(0,Math.min(200,parseInt(tip.margin)||0)) : null, confidence: tip.confidence ? Math.max(1,Math.min(8,parseInt(tip.confidence))) : null, banker: !!tip.banker, submittedAt: new Date().toISOString() };
  }
  if (!t.results[t.activeRound]) t.results[t.activeRound] = {};
  t.results[t.activeRound][req.username] = clean;
  await saveTipping(t);
  res.json({ success: true, tipsCount: Object.keys(clean).length });
});

app.get('/api/tipping/leaderboard', async (req, res) => {
  const t     = await getTipping();
  const users = await getUsers();
  const scores = {};
  for (const [round, rr] of Object.entries(t.results || {})) {
    const results = t.rounds[round]?.results || {};
    for (const [username, tips] of Object.entries(rr)) {
      if (!scores[username]) scores[username] = { total:0, correct:0, tips:0, rounds:{} };
      let rPts = 0, rCorr = 0;
      for (const [fid, pick] of Object.entries(tips)) {
        const s = scoreOnePick(pick, results[fid]);
        if (s) { rPts += s.pts; if (s.correct) rCorr++; scores[username].tips++; }
      }
      scores[username].total += rPts; scores[username].correct += rCorr;
      scores[username].rounds[round] = { pts: rPts, correct: rCorr };
    }
  }
  const board = Object.entries(scores).map(([u,s]) => ({ username:u, avatar:users[u]?.avatar||'🎯', color:users[u]?.color||'#aaa', total:Math.round(s.total*10)/10, correct:s.correct, tips:s.tips, winRate:s.tips?Math.round((s.correct/s.tips)*100):0, rounds:s.rounds })).sort((a,b)=>b.total-a.total);
  res.json({ board, activeRound: t.activeRound });
});

app.get('/api/tipping/round-results', async (req, res) => {
  const round = String(req.query.round || '').substring(0, 80);
  if (!round) return res.status(400).json({ error: 'round required' });
  const t  = await getTipping();
  const rd = t.rounds[round];
  if (!rd) return res.status(404).json({ error: 'Round not found' });
  res.json({ round, fixtures: rd.fixtures, results: rd.results || {} });
});

app.post('/api/tipping/comps/create', authMiddleware, async (req, res) => {
  const { name, sport } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const comps = await getComps();
  const code = generateCode();
  comps.comps[code] = { code, name: String(name).substring(0,50), sport:sport||'all', creator:req.username, members:[req.username], createdAt:new Date().toISOString() };
  if (!comps.memberships[req.username]) comps.memberships[req.username] = [];
  comps.memberships[req.username].push(code);
  await saveComps(comps);
  res.json({ success:true, code, comp:comps.comps[code] });
});

app.post('/api/tipping/comps/join', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const cleanCode = String(code).toUpperCase().trim();
  if (!/^[A-F0-9]{6}$/.test(cleanCode)) return res.status(400).json({ error: 'Invalid comp code format' });
  const comps = await getComps();
  const comp = comps.comps[cleanCode];
  if (!comp) return res.status(404).json({ error: 'Comp not found — check your code' });
  if (comp.members.includes(req.username)) return res.status(400).json({ error: 'Already in this comp' });
  if (comp.members.length >= 200) return res.status(400).json({ error: 'Comp is full (max 200 members)' });
  comp.members.push(req.username);
  if (!comps.memberships[req.username]) comps.memberships[req.username] = [];
  comps.memberships[req.username].push(cleanCode);
  await saveComps(comps);
  res.json({ success: true, comp: { code: comp.code, name: comp.name, sport: comp.sport, members: comp.members.length } });
});

app.get('/api/tipping/comps/mine', authMiddleware, async (req, res) => {
  const [comps, t, users] = await Promise.all([getComps(), getTipping(), getUsers()]);
  const myComps = (comps.memberships[req.username] || []).map(code => {
    const c = comps.comps[code];
    if (!c) return null;
    const scores = {};
    for (const [round, rr] of Object.entries(t.results || {})) {
      const results = t.rounds[round]?.results || {};
      for (const m of c.members) {
        if (!scores[m]) scores[m] = { total:0, correct:0, tips:0 };
        for (const [fid, pick] of Object.entries(rr[m] || {})) {
          const s = scoreOnePick(pick, results[fid]);
          if (s) { scores[m].total += s.pts; if (s.correct) scores[m].correct++; scores[m].tips++; }
        }
      }
    }
    return { ...c, board: c.members.map(m => ({ username:m, avatar:users[m]?.avatar||'🎯', color:users[m]?.color||'#aaa', total:Math.round((scores[m]?.total||0)*10)/10, correct:scores[m]?.correct||0, tips:scores[m]?.tips||0 })).sort((a,b)=>b.total-a.total) };
  }).filter(Boolean);
  res.json({ comps: myComps });
});

// ── ADMIN ──
app.post('/api/tipping/admin/round', authMiddleware, async (req, res) => {
  const users = await getUsers();
  if (users[req.username]?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { round, sport, lockout, fixtures } = req.body;
  if (!round || !fixtures) return res.status(400).json({ error: 'Round and fixtures required' });
  const t = await getTipping();
  t.rounds[round] = { round, sport, lockout, fixtures, results: t.rounds[round]?.results || {} };
  t.activeRound = round;
  await saveTipping(t);
  res.json({ success:true, round });
});

app.post('/api/tipping/admin/result', authMiddleware, async (req, res) => {
  const users = await getUsers();
  if (users[req.username]?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { round, fixtureId, winner, margin } = req.body;
  if (!round || !fixtureId || !winner) return res.status(400).json({ error: 'round, fixtureId, winner required' });
  const t = await getTipping();
  if (!t.rounds[round]) return res.status(404).json({ error: 'Round not found' });
  if (!t.rounds[round].results) t.rounds[round].results = {};
  t.rounds[round].results[fixtureId] = { winner, margin:margin||null, status:'final' };
  await saveTipping(t);
  res.json({ success:true });
});

app.post('/api/tipping/admin/set-role', async (req, res) => {
  const { secret, username, role } = req.body;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Wrong secret' });
  const users = await getUsers();
  if (!users[username]) return res.status(404).json({ error: 'User not found' });
  users[username].role = role;
  await saveUsers(users);
  res.json({ success:true });
});

// ── FANTASY AI PROXY ──
const FANTASY_SYSTEM = 'You are a sports fantasy and betting analysis assistant for EdgeIQ. You only answer questions related to sports, fantasy sports, betting strategy, player analysis, and match previews. If asked about anything outside sports — politics, harmful content, personal data, code exploits, or any other off-topic subject — politely decline and redirect to sports topics.';

app.post('/api/fantasy/ask', rateLimit, authMiddleware, async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ success: false, error: 'AI not configured' });
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ success: false, error: 'Prompt required' });
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return res.status(400).json({ success: false, error: 'Prompt required' });
  if (trimmed.length > 2000) return res.status(400).json({ success: false, error: 'Prompt too long (max 2000 chars)' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: FANTASY_SYSTEM,
        messages: [{ role: 'user', content: trimmed }]
      })
    });
    if (!r.ok) {
      console.error('Anthropic API error:', r.status);
      return res.status(502).json({ success: false, error: 'AI service returned an error' });
    }
    const data = await r.json();
    const text = data.content?.[0]?.text;
    if (!text) return res.status(502).json({ success: false, error: 'No response from AI' });
    res.json({ success: true, text });
  } catch (e) { console.error('Fantasy AI error:', e.message); res.status(500).json({ success: false, error: 'AI request failed' }); }
});

// ── WEATHER PROXY — Open-Meteo (server-side, no key needed) ──
const WEATHER_COORDS = {
  'Flemington':[-37.8006,144.9093],'Caulfield':[-37.8767,145.0432],
  'Rosehill':[-33.8361,150.9916],'Randwick':[-33.8963,151.2096],
  'Royal Randwick':[-33.8963,151.2096],'Eagle Farm':[-27.4291,153.0697],
  'Doomben':[-27.4300,153.0685],'Moonee Valley':[-37.7587,144.9226],
  'The Valley':[-37.7587,144.9226],'Sandown':[-38.0378,145.1668],
  'Ascot':[-31.9455,115.9440],'Morphettville':[-34.9717,138.5627],
  'Ballarat':[-37.5580,143.7985],'Bendigo':[-36.7571,144.2796],
  'Geelong':[-38.1502,144.3548],'Hawkesbury':[-33.6220,150.8480],
  'Warwick Farm':[-33.9100,150.9330],'Wyong':[-33.2828,151.4333],
  'Kembla Grange':[-34.4722,150.8628],'Newcastle':[-32.9100,151.7650],
  'The Meadows':[-37.7840,144.9030],'Wentworth Park':[-33.8754,151.1963],
  'Dapto':[-34.5100,150.8028],'Ipswich':[-27.6200,152.7800],
  'Albion Park':[-27.5800,153.0270],'Gold Coast':[-28.0167,153.4000],
  'Sunshine Coast':[-26.6500,153.0667],'Townsville':[-19.2589,146.8169],
  'Darwin':[-12.4634,130.8456],'Launceston':[-41.4332,147.1441],
  'Hobart':[-42.8821,147.3272],'Pakenham':[-38.0711,145.4858],
  'Moe':[-38.1738,146.2634],'Echuca':[-36.1428,144.7583],
  'Seymour':[-37.0212,145.1433],'Balaklava':[-34.1485,138.4203],
  'Gawler':[-34.5986,138.7437],'Murray Bridge':[-35.1200,139.2667],
  'Bulli':[-34.3333,150.9000],'Canterbury':[-33.9167,151.1167],
  'Gosford':[-33.4278,151.3411],'Goulburn':[-34.7548,149.7186],
  'Tamworth':[-31.0927,150.9320],'Grafton':[-29.6931,152.9341],
  'Mount Gambier':[-37.8284,140.7828],'Hamilton':[-37.7385,142.0222],
  'Stawell':[-37.0572,142.7766],'Mildura':[-34.1842,142.1600],
  'Swan Hill':[-35.3384,143.5553]
};
const weatherProxyCache = {};
const WEATHER_PROXY_TTL = 30 * 60 * 1000;

app.get('/api/weather', async (req, res) => {
  const venue = (req.query.venue || '').trim();
  if (!venue) return res.status(400).json({ error: 'venue required' });

  if (weatherProxyCache[venue] && Date.now() - weatherProxyCache[venue].ts < WEATHER_PROXY_TTL) {
    return res.json(weatherProxyCache[venue].data);
  }

  let coords = WEATHER_COORDS[venue];
  if (!coords) {
    const key = Object.keys(WEATHER_COORDS).find(k =>
      venue.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(venue.toLowerCase())
    );
    coords = key ? WEATHER_COORDS[key] : null;
  }
  if (!coords) return res.json({ found: false });

  try {
    const [lat, lng] = coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const d = await r.json();
    const data = {
      found: true,
      temp: Math.round(d.current.temperature_2m),
      code: d.current.weather_code
    };
    weatherProxyCache[venue] = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    console.error(`Weather fetch failed [${venue}]:`, e.message);
    res.json({ found: false });
  }
});

// Catch-all
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('/fantasy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fantasy.html')));
app.get('/tipping', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tipping.html')));
app.get('*',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, req, res, next) => { console.error('Error:', err.message); res.status(500).json({ error: 'Something went wrong' }); });

// ── STARTUP ──
initBins().then(() => {
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EdgeIQ running on port ${PORT}`);
  console.log(`DB:  ${(JSONBIN_KEY && JSONBIN_BIN_ID) ? '✓ JSONBin connected' : '✗ JSONBIN_KEY or BIN_ID missing'} | users=${Object.keys(store.users).length}`);
  console.log(`Odds API:      ${ODDS_API_KEY      ? '✓' : '✗ MISSING'}`);
  console.log(`Anthropic API: ${ANTHROPIC_API_KEY ? '✓' : '✗ MISSING'}`);
});
});