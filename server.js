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
const AI_TTL     = 3 * 60 * 60 * 1000;

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
  const username = getSession(req.headers['x-session-token'] || req.query.token);
  if (!username) return res.status(401).json({ error: 'Not authenticated' });
  req.username = username;
  next();
}

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════
const rateLimitStore = new Map();
function rateLimit(req, res, next) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = rateLimitStore.get(ip) || { count: 0, start: now };
  if (now - rec.start > 60000) { rec.count = 1; rec.start = now; }
  else rec.count++;
  rateLimitStore.set(ip, rec);
  if (rec.count > 30) return res.status(429).json({ error: 'Too many requests' });
  next();
}

// ═══════════════════════════════════════════════════════════════════
// ODDS
// ═══════════════════════════════════════════════════════════════════
const oddsCache = {};
const ODDS_TTL  = 15 * 60 * 1000;
let combinedOddsCache = { data: null, ts: 0 };

const ALL_SPORTS = [
  { key: 'aussierules_afl',         label: 'afl'       },
  { key: 'rugbyleague_nrl',          label: 'nrl'       },
  { key: 'soccer_australia_aleague', label: 'soccer_al' },
  { key: 'soccer_epl',               label: 'soccer_epl'},
  { key: 'mma_mixed_martial_arts',   label: 'ufc'       },
  { key: 'boxing_boxing',            label: 'boxing'    },
];

async function fetchOdds(sport) {
  if (oddsCache[sport] && Date.now() - oddsCache[sport].ts < ODDS_TTL) return oddsCache[sport].data;
  const r = await fetch(`${ODDS_BASE}/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=au&markets=h2h&oddsFormat=decimal`);
  if (!r.ok) throw new Error(`Odds API ${r.status}`);
  const data = await r.json();
  oddsCache[sport] = { data, ts: Date.now() };
  return data;
}

async function fetchAllOdds() {
  if (combinedOddsCache.data && Date.now() - combinedOddsCache.ts < ODDS_TTL) return combinedOddsCache.data;
  const results = {};
  for (const s of ALL_SPORTS) {
    try { results[s.label] = await fetchOdds(s.key); }
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
  greyhound: ['Midnight Storm','Flying Ace','Blazing Speed','Cool Operator','Star Chaser','Thunder Roll','Shadow Express','Fast Lane','Rapid Fire','Dark Comet','Lucky Strike','Jet Stream','Wild Card','Bold Move','Iron Will','Swift Justice'],
  horse: ['Northern Meteor','Southern Cross','Golden Slipper','Diamond Rain','Storm Rider','Royal Flush','Midnight Run','Silver Lining','Thunder Bay','Crystal Clear','Iron Horse','Phoenix Rising','River Dance','Ocean King','Mountain Peak','Desert Storm']
};
const FALLBACK_COMPS = {
  greyhound: ['Maiden','Grade 5','Grade 4','Free For All','Listed Race','Group 3'],
  horse: ['Maiden Plate','Benchmark 72','Benchmark 82','Class 3 Handicap','Listed Race','Group 3']
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateRacingData(type) {
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / (6 * 60 * 60 * 1000));
  const windowStart = new Date(daySeed * 6 * 60 * 60 * 1000);
  const rng = seededRandom(daySeed + (type === 'horse' ? 7777 : 3333));
  const venues = FALLBACK_VENUES[type];
  const names = FALLBACK_NAMES[type];
  const comps = FALLBACK_COMPS[type];
  const events = [];
  const numVenues = 3 + Math.floor(rng() * 3);
  const usedVenues = [];
  for (let v = 0; v < numVenues; v++) {
    const venue = venues[Math.floor(rng() * venues.length)];
    if (usedVenues.includes(venue.name)) continue;
    usedVenues.push(venue.name);
    const numRaces = 6 + Math.floor(rng() * 4);
    for (let r = 0; r < numRaces; r++) {
      const hoursAhead = 0.5 + rng() * 48;
      const raceTime = new Date(windowStart.getTime() + hoursAhead * 3600000);
      const numRunners = type === 'greyhound' ? 8 : (8 + Math.floor(rng() * 8));
      const runners = [];
      const usedNames = new Set();
      for (let i = 0; i < numRunners; i++) {
        let name;
        do { name = names[Math.floor(rng() * names.length)]; } while (usedNames.has(name));
        usedNames.add(name);
        runners.push({ name, odds: Math.round((1.5 + rng() * 20) * 100) / 100, barrier: i + 1 });
      }
      runners.sort((a, b) => a.odds - b.odds);
      const distance = type === 'greyhound' ? [315,395,515,595,715][Math.floor(rng()*5)] : [1000,1100,1200,1400,1600,2000,2400,3200][Math.floor(rng()*8)];
      events.push({
        id: `${type}_${venue.name.replace(/\s/g,'')}_R${r+1}_${daySeed}`,
        sport_key: type === 'horse' ? 'horse_racing_au' : 'greyhound_racing_au',
        home_team: runners[0].name,
        away_team: `${numRunners} runners`,
        commence_time: raceTime.toISOString(),
        venue: venue.name, state: venue.state,
        comp: comps[Math.floor(rng() * comps.length)],
        distance, raceNumber: r + 1, runners, isRacing: true, isLiveData: false
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

async function analyseMatch(ev) {
  if (!ANTHROPIC_API_KEY) return null;
  if (isFresh(aiCache, ev.id, AI_TTL)) return aiCache[ev.id].data;
  try {
    const prompt = `You are a sports betting analyst. Analyse this match and give a JSON response only.
Match: ${ev.home} vs ${ev.away} (${ev.sport})
Odds: ${ev.home} @ ${ev.homeOdds}, ${ev.away} @ ${ev.awayOdds}${ev.drawOdds ? `, Draw @ ${ev.drawOdds}` : ''}
Respond with ONLY valid JSON:
{"recommendation":"${ev.home} or ${ev.away} or Draw","confidence":75,"reasoning":"2-3 sentence analysis","valueBet":true,"keyFactor":"main reason"}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    const analysis = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{}');
    aiCache[ev.id] = { data: analysis, ts: Date.now() };
    return analysis;
  } catch (err) { console.error(`AI failed:`, err.message); return null; }
}

async function processAIQueue() {
  if (aiBusy || !aiQueue.length) return;
  aiBusy = true;
  while (aiQueue.length) {
    const ev = aiQueue.shift();
    if (!isFresh(aiCache, ev.id, AI_TTL)) { await analyseMatch(ev); await new Promise(r => setTimeout(r, 800)); }
  }
  aiBusy = false;
}

function queueAIAnalysis(events) {
  if (!ANTHROPIC_API_KEY) return;
  for (const ev of events.filter(e => !isFresh(aiCache, e.id, AI_TTL)).slice(0, 10)) {
    if (!aiQueue.find(q => q.id === ev.id)) aiQueue.push(ev);
  }
  processAIQueue();
}

// ═══════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://replit.com https://*.replit.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.anthropic.com https://api.the-odds-api.com;"
  );
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const ok = !origin || origin.endsWith('.replit.app') || origin.endsWith('.repl.co') || origin.includes('localhost');
  if (ok) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-token');
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
app.post('/api/auth/signup', async (req, res) => {
  let { username, pin, sport } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  username = username.toLowerCase().trim();
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: 'Username must be 2-20 characters' });
  if (!/^[a-z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Letters, numbers and underscores only' });
  if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  const users = await getUsers();
  if (users[username]) return res.status(409).json({ error: 'Username already taken' });
  const salt = genSalt(), pinHash = hashPin(pin, salt);
  const idx  = Object.keys(users).length % AVATARS.length;
  users[username] = { pinHash, salt, sport: sport || 'AFL', avatar: AVATARS[idx], color: COLORS[idx], createdAt: Date.now() };
  await saveUsers(users);
  const bets = await getBets();
  bets[username] = [];
  await saveBets(bets);
  const token = createSession(username);
  res.json({ success: true, token, profile: { username, avatar: users[username].avatar, color: users[username].color, sport: users[username].sport } });
});

app.post('/api/auth/signin', async (req, res) => {
  let { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  username = username.toLowerCase().trim();
  const users = await getUsers();
  const user  = users[username];
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (hashPin(pin, user.salt) !== user.pinHash) return res.status(401).json({ error: 'Incorrect PIN' });
  const token = createSession(username);
  res.json({ success: true, token, profile: { username, avatar: user.avatar, color: user.color, sport: user.sport } });
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

app.post('/api/bets', authMiddleware, async (req, res) => {
  const { bets: newBets } = req.body;
  if (!Array.isArray(newBets)) return res.status(400).json({ error: 'bets must be an array' });
  const bets = await getBets();
  bets[req.username] = newBets;
  await saveBets(bets);
  res.json({ success: true });
});

// ── LEADERBOARD ──
app.get('/api/leaderboard', async (req, res) => {
  const users = await getUsers();
  const bets  = await getBets();
  res.json({ success: true, entries: Object.keys(users).map(u => ({ username: u, avatar: users[u].avatar, color: users[u].color, bets: bets[u] || [] })) });
});

// ── ODDS ──
app.get('/api/odds', rateLimit, async (req, res) => {
  try {
    const raw = await fetchAllOdds();
    const sportLabels = { afl:'AFL', nrl:'NRL', soccer_al:'Soccer', soccer_epl:'Soccer', ufc:'UFC', boxing:'Boxing' };
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
    res.json({ success: true, events, cacheAge, nextRefresh, cacheTTL: ODDS_TTL / 1000 });
  } catch (e) { console.error('Odds error:', e); res.status(500).json({ success: false, error: 'Failed to fetch odds' }); }
});

// ── AI ANALYSE ──
app.post('/api/analyse', rateLimit, authMiddleware, async (req, res) => {
  const { event } = req.body;
  if (!event?.id) return res.status(400).json({ success: false, error: 'Event data required' });
  try {
    if (isFresh(aiCache, event.id, AI_TTL)) return res.json({ success: true, analysis: aiCache[event.id].data });
    const analysis = await analyseMatch(event);
    if (!analysis) return res.status(503).json({ success: false, error: 'AI unavailable' });
    res.json({ success: true, analysis });
  } catch { res.status(500).json({ success: false, error: 'Analysis failed' }); }
});

// ── DB TEST ──
app.get('/api/db-test', async (req, res) => {
  res.json({
    hasKey: !!JSONBIN_KEY, hasBinId: !!JSONBIN_BIN_ID,
    storeLoaded, userCount: Object.keys(store.users).length
  });
});

// ── HEALTH ──
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', db: !!(JSONBIN_KEY && JSONBIN_BIN_ID), storeLoaded, users: Object.keys(store.users).length, aiEnabled:!!ANTHROPIC_API_KEY, aiCached:Object.keys(aiCache).length, time:new Date().toISOString() });
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
  const t  = await getTipping();
  const rd = t.rounds[req.query.round];
  if (!rd) return res.status(404).json({ error: 'Round not found' });
  res.json({ round: req.query.round, fixtures: rd.fixtures, results: rd.results || {} });
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
  const comps = await getComps();
  const comp = comps.comps[code.toUpperCase()];
  if (!comp) return res.status(404).json({ error: 'Comp not found — check your code' });
  if (comp.members.includes(req.username)) return res.status(400).json({ error: 'Already in this comp' });
  comp.members.push(req.username);
  if (!comps.memberships[req.username]) comps.memberships[req.username] = [];
  comps.memberships[req.username].push(code.toUpperCase());
  await saveComps(comps);
  res.json({ success:true, comp });
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
app.post('/api/fantasy/ask', rateLimit, authMiddleware, async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ success: false, error: 'AI not configured' });
  const { prompt, title } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ success: false, error: 'Prompt required' });
  if (prompt.length > 3000) return res.status(400).json({ success: false, error: 'Prompt too long' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
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