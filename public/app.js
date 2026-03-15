// ═══════════════════════════════════════════════════════════════════
// THE EDGE — JS ARCHITECTURE MAP
// ═══════════════════════════════════════════════════════════════════
// When ready to split into separate files, cut along these boundaries:
//
// ┌──────────────────────────────────────────────────────┐
// │ MODULE 1: config.js                                   │
// │   → BETS_KEY, SPORTS, SPORT_COLOR, VENUE_COORDS      │
// │   → Sport config, color maps, static data             │
// ├──────────────────────────────────────────────────────┤
// │ MODULE 2: data.js                                     │
// │   → loadBets, saveBets, calcPnl, getStats, calcStreak │
// │   → enrichEvent, hashCode, fetchLiveOdds              │
// │   → Weather API, Speed Map builder                    │
// ├──────────────────────────────────────────────────────┤
// │ MODULE 3: render.js                                   │
// │   → renderHome, renderTips, renderUpcoming            │
// │   → renderMyBets, renderLeaderboard, renderAnalysis   │
// │   → matchCard, renderAIPicks, renderMOTD              │
// │   → DocumentFragment builders for tables/cards        │
// ├──────────────────────────────────────────────────────┤
// │ MODULE 4: ui.js                                       │
// │   → showPage, setSport, showToast, tag, sportTag      │
// │   → openBetForm, closeBetForm, openMatchModal         │
// │   → openAIAnalysis, bet slip, bookie sheet            │
// │   → Bottom nav, mobile sheets                         │
// ├──────────────────────────────────────────────────────┤
// │ MODULE 5: auth.js                                     │
// │   → doSignIn, doSignUp, doLogout, loginAs             │
// │   → Token management, PIN reset flow                  │
// └──────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════
const BETS_KEY = 'edgeiq-bets-v1';
let bets = [];
let betSlip = [];
let editId = null;
let deleteId = null;
let currentSport = 'all';
let currentBetFilter = 'ALL';
let currentLbSport = 'overall';

function loadBets()  { try { return JSON.parse(localStorage.getItem(BETS_KEY)||'[]'); } catch{return[];} }
function saveBets()  { localStorage.setItem(BETS_KEY, JSON.stringify(bets)); }
bets = loadBets();

// ── Sport config ──
const SPORTS = {
  afl:       { label:'AFL',          icon:'🏉', color:'#e8314a' },
  nrl:       { label:'NRL',          icon:'🏈', color:'#00c85a' },
  nba:       { label:'NBA',          icon:'🏀', color:'#c9122a' },
  soccer:    { label:'Soccer',       icon:'⚽', color:'#3b82f6' },
  ufc:       { label:'UFC/MMA',      icon:'🥊', color:'#f59e0b' },
  boxing:    { label:'Boxing',       icon:'🥋', color:'#8b5cf6' },
  greyhound: { label:'Greyhound',    icon:'🐕', color:'#06b6d4' },
  horse:     { label:'Horse Racing', icon:'🏇', color:'#f97316' },
};

const SPORT_COLOR = {
  'AFL':'#e8314a','NRL':'#00c85a','NBA':'#c9122a','Soccer':'#3b82f6',
  'UFC':'#f59e0b','Boxing':'#8b5cf6','Greyhound':'#06b6d4','Horse Racing':'#f97316'
};

const SPORT_FILTER_MAP = {
  'afl': 'AFL', 'nrl': 'NRL', 'nba': 'NBA', 'soccer': 'Soccer',
  'ufc': 'UFC', 'boxing': 'Boxing', 'greyhound': 'Greyhound', 'horse': 'Horse Racing'
};

function matchesSportFilter(sportLabel, filterKey) {
  if (filterKey === 'all') return true;
  return sportLabel === SPORT_FILTER_MAP[filterKey];
}

// ═══════════════════════════════════════════════════════════════════
// WEATHER — Open-Meteo (free, no key needed)
// ═══════════════════════════════════════════════════════════════════
const VENUE_COORDS = {
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
  'Darwin':[-12.4634,130.8456],'Alice Springs':[-23.6980,133.8807],
  'Launceston':[-41.4332,147.1441],'Hobart':[-42.8821,147.3272],
  'Devonport':[-41.1767,146.3536],'Pakenham':[-38.0711,145.4858],
  'Moe':[-38.1738,146.2634],'Echuca':[-36.1428,144.7583],
  'Swan Hill':[-35.3384,143.5553],'Mildura':[-34.1842,142.1600],
  'Seymour':[-37.0212,145.1433],'Stawell':[-37.0572,142.7766],
  'Hamilton':[-37.7385,142.0222],'Balaklava':[-34.1485,138.4203],
  'Mount Gambier':[-37.8284,140.7828],'Gawler':[-34.5986,138.7437],
  'Murray Bridge':[-35.1200,139.2667],'Bulli':[-34.3333,150.9000],
  'Canterbury':[-33.9167,151.1167],'Gosford':[-33.4278,151.3411],
  'Goulburn':[-34.7548,149.7186],'Mudgee':[-32.5949,149.5875],
  'Orange':[-33.2830,149.1000],'Tamworth':[-31.0927,150.9320],
  'Grafton':[-29.6931,152.9341],'Coffs Harbour':[-30.2963,153.1135]
};
const weatherCache = {};
function wmoEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  return '⛈️';
}
async function fetchVenueWeather(venue) {
  if (venue in weatherCache) return weatherCache[venue];
  try {
    const r = await fetch(`/api/weather?venue=${encodeURIComponent(venue)}`);
    const d = await r.json();
    const w = d.found ? { temp: d.temp, code: d.code } : null;
    weatherCache[venue] = w;
    return w;
  } catch(e) { weatherCache[venue] = null; return null; }
}
// ═══════════════════════════════════════════════════════════════════
// SPEED MAP — Algorithmic predicted race patterns
// ═══════════════════════════════════════════════════════════════════
function buildSpeedMap(runners, sport) {
  if (!runners || runners.length < 2) return { html: '', positions: {} };
  const isGrey = sport === 'Greyhound';

  const scored = runners.map((r, idx) => {
    const barrier = r.barrier || (idx + 1);
    // Barrier score: in greyhounds box 1-2 dominate; in horses barrier 1-4 has rail advantage
    const barrierScore = isGrey
      ? Math.max(0, (3 - barrier) * 22)
      : Math.max(0, (5 - barrier) * 7);
    // Market price: favourites often dictate pace
    const oddsScore = (r.odds && r.odds < 99) ? Math.max(0, (10 - r.odds) * 4) : 0;
    // Recent form: wins and places in last 5 suggest confidence to lead
    let formScore = 0;
    if (r.last5) {
      r.last5.split('-').slice(-4).forEach((res, i) => {
        if (res === 'W') formScore += (i + 1) * 2.5;
        else if (res === 'P') formScore += (i + 1) * 0.8;
      });
    }
    // Deterministic jitter from name so same field always maps the same way
    let hash = 0;
    for (const ch of (r.name || '').slice(0, 5)) hash = (hash * 31 + ch.charCodeAt(0)) % 100;
    const jitter = (hash % 18) - 9;
    return { ...r, _score: barrierScore + oddsScore + formScore + jitter, barrier };
  });

  scored.sort((a, b) => b._score - a._score);
  const n = scored.length;
  const positions = {};
  scored.forEach((r, i) => {
    let pos;
    if (i === 0)                        pos = 'Leader';
    else if (i <= Math.ceil(n * 0.28))  pos = 'On-pace';
    else if (i <= Math.ceil(n * 0.60))  pos = 'Midfield';
    else                                pos = 'Back';
    r._pos = pos;
    positions[r.name] = pos;
  });

  const groups = ['Leader', 'On-pace', 'Midfield', 'Back']
    .map(pos => ({ pos, runners: scored.filter(r => r._pos === pos) }))
    .filter(g => g.runners.length);

  const posStyle = {
    'Leader':   { col: '#00ffa3', icon: '🔥', desc: isGrey ? 'Box burster, rail position' : 'Likely to lead from the gates' },
    'On-pace':  { col: '#10b981', icon: '⚡', desc: 'Pressing the pace, 1-2 lengths off lead' },
    'Midfield': { col: '#3b82f6', icon: '📍', desc: 'Mid-pack, looking for a run at the turn' },
    'Back':     { col: '#8b5cf6', icon: '🐢', desc: 'Off the speed, needs late surge' },
  };

  const html = `
  <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px">🗺️ PREDICTED SPEED MAP</div>
    <div style="background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--border2)">
      ${groups.map((g, gi) => {
        const s = posStyle[g.pos];
        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px${gi > 0 ? ';border-top:1px solid var(--border)' : ''}">
          <div style="min-width:80px;padding-top:2px">
            <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:${s.col};text-transform:uppercase">${s.icon} ${g.pos}</div>
            <div style="font-size:8px;color:var(--muted);margin-top:2px;line-height:1.3">${s.desc}</div>
          </div>
          <div style="flex:1;display:flex;flex-wrap:wrap;gap:4px">
            ${g.runners.map(r => `<span style="font-size:11px;background:${s.col}15;border:1px solid ${s.col}40;border-radius:4px;padding:2px 7px;color:var(--text);white-space:nowrap;font-weight:500">${r.barrier ? `<span style="color:${s.col};font-weight:700;font-size:9px">${r.barrier}</span> ` : ''}${r.name.split(' ')[0]}</span>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:9px;color:var(--muted);margin-top:8px;opacity:.65;line-height:1.4">AI-estimated race patterns from barrier draw, market price &amp; recent form. Indicative only — conditions &amp; race-day tactics will vary.</div>
  </div>`;

  return { html, positions };
}

async function attachWeatherInfo() {
  const spans = document.querySelectorAll('[data-weather-venue]');
  const venues = [...new Set([...spans].map(s=>s.dataset.weatherVenue))];
  await Promise.all(venues.map(v => fetchVenueWeather(v)));
  spans.forEach(span => {
    const w = weatherCache[span.dataset.weatherVenue];
    if (w) span.textContent = `${wmoEmoji(w.code)} ${w.temp}°C`;
    else span.textContent = '';
  });
}

// ── Live odds data — fetched from server ──
let UPCOMING = [];
let oddsLoading = false;
let oddsLoaded = false;

let oddsLastUpdated = null;

function enrichEvent(ev) {
  // Guard: skip entirely if event is null/undefined
  if (!ev) return null;

  // Safe date parsing — fallback to 'TBC' if commenceTime is missing or invalid
  let time = 'TBC';
  try {
    const d = new Date(ev.commenceTime);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
      const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
      time = `${dayLabel} ${timeStr}`;
    }
  } catch (e) { /* keep time as 'TBC' */ }

  // Safely coerce odds to numbers (API might return strings or nulls)
  const homeOdds = parseFloat(ev.homeOdds) || 0;
  const awayOdds = parseFloat(ev.awayOdds) || 0;
  const drawOdds = parseFloat(ev.drawOdds) || 0;

  if (ev.isRacing) {
    const distLabel = ev.distanceLabel || (ev.distance ? `${ev.distance}m` : '');
    return {
      ...ev,
      homeOdds, awayOdds, drawOdds,
      time,
      venue: ev.venue || 'TBC',
      comp: ev.comp || ev.sport || 'Racing',
      pick: ev.home || '—',
      confidence: homeOdds > 0 ? Math.round(50 + (1 / homeOdds) * 40) : 50,
      valueBet: homeOdds >= 3.0 && homeOdds <= 8.0,
      keyFactor: distLabel,
      reasoning: '',
      homeRecord: ev.runners ? `${ev.runners.length} runners · ${distLabel}` : '',
      awayRecord: ''
    };
  }

  const compMap = { AFL: 'AFL Premiership', NRL: 'NRL Premiership', Soccer: 'A-League / EPL', UFC: 'UFC Main Card', Boxing: 'Boxing' };
  const venueMap = {
    AFL: ['MCG', 'Marvel Stadium', 'SCG', 'Adelaide Oval', 'Optus Stadium', 'Gabba', 'GMHBA Stadium', 'ENGIE Stadium'],
    NRL: ['Accor Stadium', 'Suncorp Stadium', 'BlueBet Stadium', 'Commbank Stadium', '4 Pines Park', 'WIN Stadium'],
    Soccer: ['AAMI Park', 'Allianz Stadium', 'Hindmarsh Stadium', 'Suncorp Stadium'],
    UFC: ['UFC APEX', 'T-Mobile Arena', 'Madison Square Garden'],
    Boxing: ['MGM Grand', 'Wembley Stadium', 'Madison Square Garden']
  };
  const venues = venueMap[ev.sport] || ['TBC'];
  const venue = venues[Math.abs(hashCode(String(ev.id || ''))) % venues.length];
  const comp = compMap[ev.sport] || ev.sport || 'Unknown';

  // Safe confidence calculation — avoid division by zero
  const maxOdds = Math.max(homeOdds, awayOdds, 0.01);
  const pick = ev.recommendation || (homeOdds > 0 && awayOdds > 0 && homeOdds <= awayOdds ? ev.home : ev.away) || '—';
  const confidence = ev.confidence || (homeOdds > 0 && awayOdds > 0
    ? Math.round(50 + (Math.abs(homeOdds - awayOdds) / maxOdds) * 40)
    : 50);
  const valueBet = ev.valueBet != null ? ev.valueBet : (homeOdds >= 1.8 && homeOdds <= 3.5) || (awayOdds >= 1.8 && awayOdds <= 3.5);

  return {
    ...ev,
    homeOdds, awayOdds, drawOdds,
    time,
    venue,
    comp,
    pick,
    confidence: Math.min(99, Math.max(0, confidence)),
    valueBet,
    keyFactor: ev.keyFactor || '',
    reasoning: ev.reasoning || '',
    homeRecord: '',
    awayRecord: ''
  };
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

let oddsNextRefresh = 21600; // default 6 hours — matches server TTL
let oddsPollTimer   = null;
let oddsCreditsRemaining = null;

// ── IDLE DETECTION ──
// Reset the "last active" timestamp whenever the user touches the page
let _lastActivity = Date.now();
['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, () => { _lastActivity = Date.now(); }, { passive: true });
});
function isUserIdle() {
  return (Date.now() - _lastActivity) > 15 * 60 * 1000; // 15 min idle threshold
}

async function fetchLiveOdds(forceRefresh = false) {
  if (oddsLoading) return;
  // Respect idle state unless this is a manual force-refresh
  if (!forceRefresh && isUserIdle()) {
    scheduleNextOddsPoll();
    return;
  }
  oddsLoading = true;
  showOddsLoading(true);
  try {
    const res  = await fetch('/api/odds');
    const data = await res.json();
    if (data.success && data.events?.length) {
      UPCOMING = data.events.map(enrichEvent).filter(Boolean);
      oddsLoaded = true;
      // Use server cacheAge to set the true time odds were last fetched (not just when client received them)
      oddsLastUpdated = data.cacheAge ? Date.now() - (data.cacheAge * 1000) : Date.now();
      if (data.nextRefresh)        oddsNextRefresh = data.nextRefresh;
      if (data.creditsRemaining != null) {
        oddsCreditsRemaining = data.creditsRemaining;
        updateCreditsBadge();
      }
      updateLastUpdatedBadge();
      scheduleNextOddsPoll();
      const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
      if (activePage) showPage(activePage);
    } else {
      if (!oddsLoaded) showToast('⚠️ No live odds right now — using fallback data', false);
      scheduleNextOddsPoll();
    }
  } catch(err) {
    showToast('⚠️ Could not load live odds', false);
    console.error(err);
    scheduleNextOddsPoll();
  } finally {
    oddsLoading = false;
    showOddsLoading(false);
  }
}

function scheduleNextOddsPoll() {
  if (oddsPollTimer) clearTimeout(oddsPollTimer);
  // Only schedule if tab is visible; visibility change handler will resume when tab returns
  if (document.hidden) return;
  const waitSecs = Math.max(300, oddsNextRefresh); // minimum 5-min client-side wait
  oddsPollTimer = setTimeout(() => {
    if (!document.hidden && !isUserIdle()) fetchLiveOdds();
    else scheduleNextOddsPoll(); // push it out further if still idle/hidden
  }, waitSecs * 1000);
}

// ── PAGE VISIBILITY API — pause/resume when tab is hidden/shown ──
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Tab just became visible — check if cache is stale
    const staleThreshold = oddsNextRefresh * 1000;
    const dataAge = oddsLastUpdated ? (Date.now() - oddsLastUpdated) : Infinity;
    if (dataAge > staleThreshold) fetchLiveOdds();
    else scheduleNextOddsPoll(); // data is still fresh, just reschedule
  } else {
    // Tab hidden — cancel pending poll to avoid wasting credits
    if (oddsPollTimer) { clearTimeout(oddsPollTimer); oddsPollTimer = null; }
  }
});

function updateLastUpdatedBadge() {
  const el = document.getElementById('live-badge-text');
  if (!el) return;
  if (!oddsLastUpdated) { el.textContent = 'LIVE ODDS'; return; }
  const mins = Math.floor((Date.now() - oddsLastUpdated) / 60000);
  el.textContent = mins < 1 ? 'JUST UPDATED' : mins < 60 ? `UPDATED ${mins}m AGO` : `UPDATED ${Math.floor(mins/60)}h AGO`;
}

function showOddsLoading(show) {
  const el = document.getElementById('live-badge-text');
  if (!el) return;
  if (show) { el.textContent = 'LOADING...'; }
  else { updateLastUpdatedBadge(); } // show true age, not "JUST UPDATED"
}

function updateCreditsBadge() {
  const el = document.getElementById('credits-badge');
  if (oddsCreditsRemaining === null) return;
  const pct  = Math.round((oddsCreditsRemaining / 500) * 100);
  const col  = oddsCreditsRemaining > 100 ? '#10b981' : oddsCreditsRemaining > 30 ? '#f59e0b' : '#ef4444';
  if (el) {
    el.style.display = 'inline-flex';
    el.style.color   = col;
    el.title = `${oddsCreditsRemaining} API credits remaining (${pct}% of 500)`;
    el.textContent   = `⚡ ${oddsCreditsRemaining} credits`;
  }
  const sheetLabel = document.getElementById('sheet-credits-label');
  if (sheetLabel) sheetLabel.textContent = `⚡ ${oddsCreditsRemaining} credits remaining`;
}

// Manual refresh — user-triggered, bypasses idle check
function manualRefreshOdds() {
  const btn = document.getElementById('btn-manual-refresh');
  if (btn) { btn.disabled = true; btn.textContent = '↻ Refreshing...'; }
  fetchLiveOdds(true).finally(() => {
    if (btn) {
      btn.textContent = '↻ Refresh Odds';
      // 60-second cooldown before allowing another manual refresh
      setTimeout(() => { btn.disabled = false; }, 60 * 1000);
    }
  });
}

setInterval(updateLastUpdatedBadge, 60 * 1000);

// ── Sample H2H data ──
const H2H = {
  'Collingwood_Richmond': { home:8, away:6, draws:0, last5:['W','L','W','W','L'] },
  'Geelong_Brisbane':     { home:5, away:7, draws:0, last5:['L','W','L','L','W'] },
  'Melbourne Storm_Penrith Panthers': { home:6, away:7, draws:1, last5:['L','W','L','W','W'] },
};

// ═══════════════════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════════════════
function calcPnl(b) {
  if (b.result==='WIN')   return b.stake * b.odds - b.stake;
  if (b.result==='PLACE') return (b.stake * b.odds) / 4 - b.stake;
  if (b.result==='PUSH')  return 0;
  if (b.result==='PENDING') return 0;
  return -b.stake;
}
function fmt$(n)   { return '$'+Math.abs(n).toFixed(2); }
function fmtPnl(n) { return (n>=0?'+':'-')+fmt$(n); }

function getStats(betList) {
  const settled = betList.filter(b=>b.result!=='PENDING');
  const wins    = settled.filter(b=>b.result==='WIN');
  const ts      = settled.reduce((s,b)=>s+(b.stake||0),0);
  const tr      = settled.reduce((s,b)=>{ if(b.result==='WIN') return s+b.stake*b.odds; if(b.result==='PLACE') return s+(b.stake*b.odds)/4; return s; },0);
  const profit  = tr - ts;
  const roi     = ts>0 ? ((profit/ts)*100).toFixed(1) : '0.0';
  const winRate = settled.length>0 ? ((wins.length/settled.length)*100).toFixed(1) : '0.0';
  const avgOdds = betList.length>0 ? (betList.reduce((s,b)=>s+(b.odds||0),0)/betList.length).toFixed(2) : '0.00';
  const bestWin = wins.reduce((best,b)=>(b.odds>(best?.odds||0)?b:best),null);
  const pending = betList.filter(b=>b.result==='PENDING').length;
  return {wins,settled,ts,tr,profit,roi,winRate,avgOdds,bestWin,pending,total:betList.length};
}

// ═══════════════════════════════════════════════════════════════════
// TAG / BADGE HELPERS
// ═══════════════════════════════════════════════════════════════════
function tag(text, color) {
  return `<span class="tag" style="color:${color};background:${color}18;border-color:${color}40">${text}</span>`;
}
function resultTag(r) {
  const m={WIN:'#10b981',LOSS:'#ef4444',PLACE:'#3b82f6',PUSH:'#6b7280',PENDING:'#f59e0b'};
  return tag(r, m[r]||'#aaa');
}
function sportTag(s) {
  return tag(s, SPORT_COLOR[s]||'#aaa');
}
function confColor(c) {
  if(c>=75) return '#10b981';
  if(c>=60) return '#f59e0b';
  return '#ef4444';
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════
function setActiveBottomNav(btn) {
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

// ── Mobile sheet helpers ──
function openUserSheet() {
  document.getElementById('user-menu-sheet').classList.add('open');
  document.getElementById('user-menu-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeUserSheet() {
  document.getElementById('user-menu-sheet').classList.remove('open');
  document.getElementById('user-menu-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function openMoreSheet() {
  document.getElementById('more-menu-sheet').classList.add('open');
  document.getElementById('more-menu-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMoreSheet() {
  document.getElementById('more-menu-sheet').classList.remove('open');
  document.getElementById('more-menu-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.querySelector(`.nav-btn[onclick="showPage('${name}')"]`)?.classList.add('active');
  // Sync bottom nav
  const bnav = document.querySelector(`.bnav-btn[onclick*="'${name}'"]`);
  setActiveBottomNav(bnav);
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='home')        renderHome();
  if(name==='tips')        renderTips();
  if(name==='upcoming')    renderUpcoming();
  if(name==='mybets')      renderMyBets();
  if(name==='leaderboard') renderLeaderboard();
  if(name==='analysis')    renderAnalysis();
}

function setSport(sport) {
  currentSport = sport;
  document.querySelectorAll('.sport-chip').forEach(c=>{
    c.classList.toggle('active', c.dataset.sport===sport);
    if(c.dataset.sport===sport) {
      c.style.background = sport==='all' ? '#10b981' : (SPORTS[sport]?.color || '#10b981');
      c.style.color = '#000';
    } else {
      c.style.background=''; c.style.color='';
    }
  });
  if (sport !== 'all') {
    showPage('upcoming');
  } else {
    const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
    if(activePage) showPage(activePage);
  }
}

// ═══════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════
function renderQuickStart() {
  const el = document.getElementById('home-quickstart');
  if (!el) return;
  if (!oddsLoaded) { el.innerHTML = ''; return; }

  // Best pick = highest-confidence value bet, or just top confidence if none
  const pool = UPCOMING.filter(m => matchesSportFilter(m.sport, currentSport));
  const valuePicks = [...pool].filter(m => m.valueBet).sort((a,b) => b.confidence - a.confidence);
  const topPicks   = [...pool].sort((a,b) => b.confidence - a.confidence);
  const m = valuePicks[0] || topPicks[0];
  if (!m) { el.innerHTML = ''; return; }

  const isRacing = m.sport==='Greyhound'||m.sport==='Horse Racing';
  const sc = SPORT_COLOR[m.sport] || '#aaa';
  const oddsVal = m.pick===m.home ? m.homeOdds : m.pick===m.away ? m.awayOdds : m.drawOdds;
  const eventLabel = isRacing ? `R${m.raceNumber} · ${m.venue}` : `${m.home} vs ${m.away}`;
  const isValue = !!m.valueBet;

  const introLines = isValue
    ? `Our AI spotted a <strong style="color:#10b981">value edge</strong> — the odds on offer are better than the true probability suggests. A favourite pick for sharps.`
    : `Our AI's <strong style="color:#10b981">top confidence pick</strong> right now. Click to see the full analysis before placing a bet.`;

  el.innerHTML = `
    <div class="qs-strip" onclick="openMatchModal('${m.id}')">
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <div class="qs-badge">${isValue ? '⚡ BEST VALUE RIGHT NOW' : '🎯 TOP PICK RIGHT NOW'}</div>
        <div class="qs-label">AI PICK</div>
        <div class="qs-pick">${m.pick}</div>
        ${oddsVal ? `<div class="qs-odds">@ ${oddsVal}x</div>` : ''}
        <div class="qs-conf">${m.confidence}% confidence</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,.08);align-self:stretch;flex-shrink:0"></div>
      <div style="flex:1;min-width:140px">
        <div class="qs-label">EVENT</div>
        <div class="qs-event" style="margin-bottom:6px">${eventLabel}</div>
        <div class="qs-intro">${introLines}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0;margin-left:auto">
        ${tag(m.sport, sc)}
        <button onclick="event.stopPropagation();openBetFormWithMatch('${m.id}')"
          style="background:linear-gradient(90deg,#10b981,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;white-space:nowrap">
          + LOG THIS BET
        </button>
      </div>
    </div>`;
}

function renderHome() {
  const s = getStats(bets);
  const pos = s.profit >= 0;

  // Stats
  document.getElementById('home-stats').innerHTML = [
    {label:'Net P&L',     value:fmtPnl(s.profit),   color:pos?'#10b981':'#ef4444', sub:fmt$(s.tr)+' returned', icon:'💰'},
    {label:'Win Rate',    value:s.winRate+'%',        color:'#3b82f6', sub:`${s.wins.length}W / ${s.settled.length} settled`, icon:'🎯'},
    {label:'ROI',         value:s.roi+'%',            color:parseFloat(s.roi)>=0?'#10b981':'#ef4444', sub:'Return on investment', icon:'📈'},
    {label:'Pending',     value:s.pending,            color:'#f59e0b', sub:`${s.total} total bets`, icon:'⏳'},
  ].map(c=>`
    <div class="stat-card" style="border-left:3px solid ${c.color}">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value" style="color:${c.color}">${c.value}</div>
      <div class="stat-change">${c.sub}</div>
    </div>`).join('');

  // Matches — only show actual today matches
  const filtered = UPCOMING.filter(m=>matchesSportFilter(m.sport, currentSport));
  const today = filtered.filter(m=>m.time.startsWith('Today'));
  document.getElementById('home-matches').innerHTML = !oddsLoaded
    ? `<div style="display:flex;flex-direction:column;gap:10px">${[1,2,3].map(()=>`<div class="loading-shimmer" style="height:130px;border-radius:12px"></div>`).join('')}</div>`
    : today.length
      ? today.map(m=>matchCard(m)).join('')
      : `<div class="empty" style="padding:40px;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">📅</div>
          <div style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px">NO MATCHES TODAY</div>
          <div style="color:var(--muted);font-size:13px">Check the <a href="#" onclick="showPage('upcoming')" style="color:var(--accent)">Upcoming tab</a> to see what's coming up</div>
        </div>`;

  // Recent bets
  const recent = [...bets].reverse().slice(0,5);
  document.getElementById('home-recent-bets').innerHTML = recent.length
    ? `<table style="width:100%">
        <thead><tr><th>Date</th><th>Sport</th><th>Event</th><th>Bet</th><th>Odds</th><th>Result</th><th>P&L</th></tr></thead>
        <tbody>${recent.map(b=>{const pnl=calcPnl(b);return`<tr>
          <td style="color:var(--muted);font-family:var(--mono);font-size:11px">${b.date}</td>
          <td>${sportTag(b.sport)}</td>
          <td style="font-weight:600;font-size:13px">${b.event}</td>
          <td style="color:var(--muted);font-size:12px">${b.bet}</td>
          <td style="font-family:var(--mono);font-weight:700;color:#f59e0b">${b.odds}x</td>
          <td>${resultTag(b.result)}</td>
          <td style="font-family:var(--mono);font-weight:700;color:${pnl>=0?'#10b981':'#ef4444'}">${fmtPnl(pnl)}</td>
        </tr>`;}).join('')}</tbody>
      </table>`
    : `<div class="empty">No bets logged yet — <a href="#" onclick="showPage('mybets')" style="color:var(--accent)">log your first bet</a></div>`;

  // Best Bet / Quick Start strip
  renderQuickStart();

  // Match of the Day
  renderMOTD('motd-home');

  // AI Picks panel
  renderAIPicks();

  // Pending bets panel
  renderHomePending();
}

function matchCard(m) {
  const sc = SPORT_COLOR[m.sport] || '#aaa';
  const isRacing = m.sport==='Greyhound'||m.sport==='Horse Racing';
  return `<div class="match-card" onclick="openMatchModal('${m.id}')">
    <div class="match-sport-strip" style="background:${sc}"></div>
    <div style="padding-left:8px">
      <div class="match-header">
        <div style="display:flex;align-items:center;gap:8px">
          ${tag(m.sport, sc)}
          <span style="font-size:11px;color:var(--muted)">${m.comp}</span>
          ${m.valueBet ? `<span style="background:linear-gradient(135deg,rgba(240,180,41,.18),rgba(16,185,129,.05));border:1px solid rgba(240,180,41,.5);color:#10b981;border-radius:4px;padding:1px 8px;font-size:10px;font-weight:800;animation:value-glow 2.5s ease-in-out infinite">💰 VALUE</span>` : ''}
        </div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted)">${m.time} · ${m.venue}</div>
      </div>
      ${isRacing ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-family:'Oswald',sans-serif;font-size:17px;font-weight:600">${m.home}</div>
            <div style="font-size:11px;color:var(--muted)">${m.homeRecord}</div>
          </div>
          <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:#10b981">${m.homeOdds}</div>
        </div>` : `
        <div class="match-teams">
          <div class="team">
            <div class="team-name">${m.home}</div>
            <div class="team-record">${m.homeRecord}</div>
          </div>
          <div class="vs-badge">VS</div>
          <div class="team away">
            <div class="team-name">${m.away}</div>
            <div class="team-record">${m.awayRecord}</div>
          </div>
        </div>`}
      <div class="match-odds">
        ${!isRacing ? `<div class="odd-btn${m.valueBet&&m.pick===m.home?' value':''}" onclick="selectOdd(this,'${m.id}')">
          <div class="odd-label">${m.home.split(' ').pop()}</div>
          <div class="odd-price">${m.homeOdds}</div>
          ${m.valueBet&&m.pick===m.home?`<div class="value-flag">⚡ VALUE</div>`:''}
        </div>` : ''}
        ${m.drawOdds ? `<div class="odd-btn" onclick="selectOdd(this,'${m.id}')">
          <div class="odd-label">Draw</div>
          <div class="odd-price">${m.drawOdds}</div>
        </div>` : ''}
        ${!isRacing ? `<div class="odd-btn${m.valueBet&&m.pick===m.away?' value':''}" onclick="selectOdd(this,'${m.id}')">
          <div class="odd-label">${m.away.split(' ').pop()}</div>
          <div class="odd-price">${m.awayOdds}</div>
          ${m.valueBet&&m.pick===m.away?`<div class="value-flag">⚡ VALUE</div>`:''}
        </div>` : ''}
        <div class="odd-btn" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.25)" onclick="selectOdd(this,'${m.id}')">
          <div class="odd-label" style="color:#10b981">${m.aiReady ? '🤖 AI PICK' : '📊 EST. PICK'}</div>
          <div class="odd-price" style="color:#10b981;font-size:14px">${m.pick}</div>
          <div class="value-flag" style="color:${confColor(m.confidence)}">${m.confidence}% conf${m.aiReady ? '' : ' ·  loading...'}</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// AI PICKS PANEL (sidebar)
// ═══════════════════════════════════════════════════════════════════
function renderAIPicks() {
  const top = UPCOMING.filter(m=>m.confidence>=65).sort((a,b)=>b.confidence-a.confidence).slice(0,5);
  document.getElementById('ai-picks-panel').innerHTML = top.map(m=>{
    const sc = SPORT_COLOR[m.sport]||'#aaa';
    return `<div class="ai-pick">
      <div class="ai-pick-sport" style="color:${sc}">${m.sport} · ${m.venue}</div>
      <div class="ai-pick-match">${(m.sport==='Greyhound'||m.sport==='Horse Racing') ? `R${m.raceNumber} · ${m.venue}` : `${m.home} vs ${m.away}`}</div>
      <div class="ai-pick-tip">🎯 ${m.pick}${m.valueBet?'<span class="value-chip">⚡ VALUE</span>':''}</div>
      <div class="confidence-bar">
        <div class="confidence-label">
          <span>Confidence</span>
          <span style="color:${confColor(m.confidence)}">${m.confidence}%</span>
        </div>
        <div class="conf-track"><div class="conf-fill" style="width:${m.confidence}%;background:${confColor(m.confidence)}"></div></div>
      </div>
      <div class="ai-reasoning">
        ${aiReasoning(m)}
      </div>
    </div>`;
  }).join('') || '<div class="empty">No high-confidence picks today</div>';
}

function aiReasoning(m) {
  if (m.keyFactor && m.keyFactor.length > 10) return m.keyFactor;
  if (m.reasoning && m.reasoning.length > 10) return m.reasoning;
  const reasons = {
    'AFL': `${m.pick} showing strong recent form. Home ground advantage at ${m.venue}. Line movement suggests sharp money.`,
    'NRL': `${m.pick} has won 4 of last 5. Opposition missing key players. Expect high scoring.`,
    'Soccer': `${m.pick} best value at current odds. Expected goals model shows +0.4 edge.`,
    'UFC': `${m.pick} superior striking accuracy (${m.confidence}% TD defence). Reach advantage significant.`,
    'Boxing': `${m.pick} better footwork and jab output. Judge tendencies favour aggressive style.`,
    'NBA': `${m.pick} lead the league in net rating this month. Pace and efficiency edge over opponent.`,
    'Greyhound': `Box draw advantageous. Recent times 0.3s faster than field average.`,
    'Horse Racing': `Strong wet track record. Trainer strike rate 28% at this distance.`,
  };
  return reasons[m.sport] || 'Analysis based on recent form, head-to-head, and market movement.';
}

// ═══════════════════════════════════════════════════════════════════
// TIPS PAGE
// ═══════════════════════════════════════════════════════════════════
function renderTips() {
  const filtered = UPCOMING.filter(m=>matchesSportFilter(m.sport, currentSport));
  const sorted = [...filtered].sort((a,b)=>b.confidence-a.confidence);

  // Match of the Day on tips page
  renderMOTD('motd-tips');

  // Show loading skeleton cards while odds are loading
  if (!oddsLoaded) {
    document.getElementById('tips-grid').innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;grid-column:1/-1">${[1,2,3].map(()=>`<div class="loading-shimmer" style="height:330px;border-radius:12px"></div>`).join('')}</div>`;
    return;
  }

  // Show tips if available
  if (sorted.length) {
    document.getElementById('tips-grid').innerHTML = sorted.map(m=>{
      const sc = SPORT_COLOR[m.sport]||'#aaa';
      const h2hKey = `${m.home}_${m.away}`;
      const h2h = H2H[h2hKey];
      const isRacingCard = m.sport==='Greyhound'||m.sport==='Horse Racing';
      return `<div class="card card-accent" style="border-top-color:${sc}">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px">
            ${tag(m.sport,sc)}
            <span style="font-size:12px;color:var(--muted)">${m.comp}</span>
          </div>
          <div style="font-size:11px;color:var(--muted);font-family:var(--mono)">${m.time}</div>
        </div>
        <div class="card-body">
          <div style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;margin-bottom:4px">${isRacingCard ? `R${m.raceNumber} · ${m.venue}` : `${m.home} vs ${m.away}`}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:10px">
            <span>📍 ${m.venue}</span>
            ${isRacingCard ? `<span data-weather-venue="${m.venue}" style="font-weight:600;color:var(--text)">…</span>` : ''}
            ${isRacingCard && m.going ? `<span style="background:rgba(255,255,255,.08);border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600">${m.going}</span>` : ''}
          </div>

          <!-- AI Recommendation -->
          <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#10b981;margin-bottom:8px">🤖 AI RECOMMENDATION</div>
            <div style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;margin-bottom:4px">${m.pick}</div>
            ${m.valueBet?`<div class="value-bet-badge">💰 VALUE BET DETECTED</div>`:''}
            <div class="confidence-bar">
              <div class="confidence-label">
                <span style="color:var(--muted);font-size:11px">AI Confidence</span>
                <span style="color:${confColor(m.confidence)};font-weight:700;font-family:var(--mono)">${m.confidence}%</span>
              </div>
              <div class="conf-track"><div class="conf-fill" style="width:${m.confidence}%;background:${confColor(m.confidence)}"></div></div>
            </div>
          </div>

          <!-- Odds -->
          <div style="display:flex;gap:8px;margin-bottom:14px">
            ${m.homeOdds?`<div style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px;text-align:center${m.pick===m.home?';border-color:rgba(240,180,41,.4)':''}">
              <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">${m.home.split(' ').slice(-1)[0]}</div>
              <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;color:${m.pick===m.home?'#00ffa3':'var(--text)'}">${m.homeOdds}</div>
            </div>`:''}
            ${m.drawOdds?`<div style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:1px;margin-bottom:4px">DRAW</div>
              <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700">${m.drawOdds}</div>
            </div>`:''}
            ${m.awayOdds?`<div style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px;text-align:center${m.pick===m.away?';border-color:rgba(240,180,41,.4)':''}">
              <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">${m.away.split(' ').slice(-1)[0]}</div>
              <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;color:${m.pick===m.away?'#00ffa3':'var(--text)'}">${m.awayOdds}</div>
            </div>`:''}
          </div>

          <!-- Analysis -->
          <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:14px">${aiReasoning(m)}</div>

          ${h2h?`<!-- H2H -->
          <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">HEAD TO HEAD</div>
            <div class="h2h-bar">
              <div class="h2h-side">
                <div class="h2h-wins" style="color:${sc}">${h2h.home}</div>
                <div class="h2h-label">${m.home.split(' ').slice(-1)[0]}</div>
              </div>
              <div class="h2h-vs">H2H</div>
              <div class="h2h-side">
                <div class="h2h-wins">${h2h.away}</div>
                <div class="h2h-label">${m.away.split(' ').slice(-1)[0]}</div>
              </div>
            </div>
            <div class="h2h-prog">
              <div style="background:${sc};height:100%;width:${Math.round((h2h.home/(h2h.home+h2h.away+h2h.draws))*100)}%"></div>
              <div style="background:var(--border);height:100%"></div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px">
              ${h2h.last5.map(r=>`<span style="background:${r==='W'?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'};border:1px solid ${r==='W'?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'};color:${r==='W'?'#10b981':'#ef4444'};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">${r}</span>`).join('')}
              <span style="color:var(--muted);font-size:11px;margin-left:4px">Last 5</span>
            </div>
          </div>`:''}

          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn-primary" style="flex:1" onclick="openBetFormWithMatch('${m.id}')">+ LOG BET</button>
            <button onclick="openMatchModal('${m.id}')" style="background:rgba(0,91,212,.14);border:1px solid rgba(0,91,212,.45);color:#60a5fa;border-radius:10px;padding:12px 16px;font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;letter-spacing:.5px;cursor:pointer;white-space:nowrap;transition:all .15s" onmouseover="this.style.background='rgba(0,91,212,.25)'" onmouseout="this.style.background='rgba(0,91,212,.14)'">🏦 BOOKIE</button>
          </div>
        </div>
      </div>`;
    }).join('');
    attachWeatherInfo();
  } else {
    // Show informative empty state when no tips available
    document.getElementById('tips-grid').innerHTML = `<div class="empty" style="grid-column:1/-1;padding:60px 20px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🔮</div>
      <div style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;margin-bottom:12px">NO AI TIPS AVAILABLE</div>
      <div style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:20px">
        We don't have any upcoming matches with AI analysis for the selected sport yet.<br>
        Check back soon or explore other sports!
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn-primary" onclick="setSport('all');showPage('tips')" style="padding:10px 20px">View All Sports</button>
        <button class="btn-secondary" onclick="showPage('upcoming')" style="padding:10px 20px">Browse Upcoming</button>
      </div>
    </div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UPCOMING PAGE
// ═══════════════════════════════════════════════════════════════════
function renderUpcoming() {
  const sports = ['All', ...new Set(UPCOMING.map(m=>m.sport))];
  const activeSportLabel = currentSport === 'all' ? 'All' : (SPORT_FILTER_MAP[currentSport] || 'All');
  document.getElementById('upcoming-filters').innerHTML = sports.map(s=>
    `<button class="filter-tab${s===activeSportLabel?' active':''}" onclick="filterUpcoming('${s}',this)">${s}</button>`
  ).join('');
  const filtered = activeSportLabel === 'All' ? UPCOMING : UPCOMING.filter(m=>m.sport===activeSportLabel);
  renderUpcomingTable(filtered);
}

function filterUpcoming(sport, btn) {
  document.querySelectorAll('#upcoming-filters .filter-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const reverseMap = Object.fromEntries(Object.entries(SPORT_FILTER_MAP).map(([k,v])=>[v,k]));
  currentSport = sport === 'All' ? 'all' : (reverseMap[sport] || 'all');
  document.querySelectorAll('.sport-chip').forEach(c=>{
    c.classList.toggle('active', c.dataset.sport===currentSport);
    if(c.dataset.sport===currentSport) {
      c.style.background = currentSport==='all' ? '#10b981' : (SPORTS[currentSport]?.color || '#10b981');
      c.style.color = '#000';
    } else {
      c.style.background=''; c.style.color='';
    }
  });
  const filtered = sport==='All' ? UPCOMING : UPCOMING.filter(m=>m.sport===sport);
  renderUpcomingTable(filtered);
}

function renderUpcomingTable(matches) {
  const container = document.getElementById('upcoming-table');
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = '<div class="empty">No upcoming matches</div>';
    return;
  }

  // DocumentFragment: builds entire DOM off-screen, single paint
  const frag = document.createDocumentFragment();

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const sc = SPORT_COLOR[m.sport] || '#aaa';
    const isRacing = m.sport === 'Greyhound' || m.sport === 'Horse Racing';
    const timeParts = (m.time || '').split(' ');

    const row = document.createElement('div');
    row.className = 'upcoming-row';
    row.setAttribute('data-match-id', m.id);
    row.onclick = () => openMatchModal(m.id);

    // Time column
    const timeCol = document.createElement('div');
    timeCol.className = 'upcoming-time';
    timeCol.innerHTML = `<div style="font-size:12px;font-weight:700;color:var(--text)">${timeParts.slice(0,-1).join(' ')}</div><div>${timeParts.slice(-2).join(' ')}</div>`;

    // Info column
    const infoCol = document.createElement('div');
    const matchLabel = isRacing ? `R${m.raceNumber || '?'} · ${m.venue || 'TBC'}` : `${m.home || '?'} <span>vs</span> ${m.away || '?'}`;
    const subLabel = isRacing
      ? `🏁 ${m.distance || '?'}m · ${m.comp || ''} · ${m.runners?.length || '?'} runners`
      : `📍 ${m.venue || 'TBC'} · ${m.comp || ''}`;
    infoCol.innerHTML = `${tag(m.sport, sc)}<div class="upcoming-match" style="margin-top:4px">${matchLabel}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${subLabel}</div>`;

    // AI Pick column
    const aiCol = document.createElement('div');
    aiCol.style.textAlign = 'center';
    const conf = typeof m.confidence === 'number' ? m.confidence : 0;
    aiCol.innerHTML = `<div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:1px;margin-bottom:4px">AI PICK</div><div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:#10b981">${m.pick || '—'}</div><div style="font-size:11px;color:${confColor(conf)};font-family:var(--mono)">${conf}%</div>`;

    // Odds column
    const oddsCol = document.createElement('div');
    oddsCol.className = 'upcoming-odds-row';
    let oddsHTML = '';
    if (m.homeOdds) oddsHTML += `<div class="mini-odd${m.valueBet && m.pick === m.home ? ' best' : ''}">${m.homeOdds}</div>`;
    if (m.drawOdds) oddsHTML += `<div class="mini-odd">D ${m.drawOdds}</div>`;
    if (m.awayOdds) oddsHTML += `<div class="mini-odd${m.valueBet && m.pick === m.away ? ' best' : ''}">${m.awayOdds}</div>`;
    oddsHTML += `<button class="mini-odd" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.25);color:#10b981" onclick="event.stopPropagation();openBetFormWithMatch('${m.id}')">+ BET</button>`;
    oddsCol.innerHTML = oddsHTML;

    row.appendChild(timeCol);
    row.appendChild(infoCol);
    row.appendChild(aiCol);
    row.appendChild(oddsCol);
    frag.appendChild(row);
  }

  container.innerHTML = '';
  container.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════════════
// MY BETS PAGE
// ═══════════════════════════════════════════════════════════════════
function renderMyBets() {
  const s = getStats(bets);
  const pos = s.profit>=0;
  const streak = calcStreak(bets);

  document.getElementById('mybets-stats').innerHTML = [
    {label:'Net P&L',  value:fmtPnl(s.profit), color:pos?'#10b981':'#ef4444', sub:fmt$(s.tr)+' returned'},
    {label:'Win Rate', value:s.winRate+'%',      color:'#3b82f6', sub:s.wins.length+'W / '+s.settled.length+' settled'},
    {label:'ROI',      value:s.roi+'%',          color:parseFloat(s.roi)>=0?'#10b981':'#ef4444', sub:'Return on investment'},
    {label:streak.count>1?`${streak.count}-${streak.type==='WIN'?'WIN':'LOSS'} STREAK`:'Avg Odds',
     value:streak.count>1?(streak.type==='WIN'?'🔥':'❄️')+streak.count:s.avgOdds+'x',
     color:streak.count>1?(streak.type==='WIN'?'#10b981':'#ef4444'):'#f59e0b',
     sub:streak.count>1?`Current ${streak.type.toLowerCase()} streak`:'Mean dividend'},
  ].map(c=>`<div class="stat-card" style="border-left:3px solid ${c.color}">
    <div class="stat-label">${c.label}</div>
    <div class="stat-value" style="color:${c.color}">${c.value}</div>
    <div class="stat-change">${c.sub}</div>
  </div>`).join('');

  drawPnlChart(bets);
  filterBets(currentBetFilter, null);
}

function shareMyStats() {
  const s = getStats(bets);
  const name = currentUser?.username || 'Anonymous';
  const sportCounts = {};
  bets.forEach(b => { sportCounts[b.sport] = (sportCounts[b.sport]||0)+1; });
  const topSport = Object.entries(sportCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
  const streak = calcStreak(bets);
  const streakTxt = streak.count > 1 ? `${streak.count}-${streak.type === 'WIN' ? 'Win' : 'Loss'} Streak` : '';
  const text = [
    `🏆 ${name}'s EdgeIQ Betting Stats`,
    `──────────────────`,
    `📊 Net P&L: ${fmtPnl(s.profit)}`,
    `✅ Win Rate: ${s.winRate}%  (${s.wins.length}W / ${s.settled.length} settled)`,
    `💰 ROI: ${s.roi}%`,
    `📈 Avg Odds: ${s.avgOdds}x`,
    `🏅 Top Sport: ${topSport}`,
    streakTxt ? `🔥 ${streakTxt}` : '',
    `──────────────────`,
    `Tracked on edgebets.net`
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    navigator.share({ title: `${name}'s Betting Stats`, text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Stats copied to clipboard!', false);
    }).catch(() => {
      showToast('⚠️ Could not copy stats', true);
    });
  }
}

function filterBets(sport, btn) {
  currentBetFilter = sport;
  if(btn) {
    document.querySelectorAll('#mybets-filters .filter-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  let out = sport==='ALL' ? [...bets] : bets.filter(b=>b.sport===sport);
  if (betSearchQuery) {
    out = out.filter(b => {
      const q = betSearchQuery;
      return (b.event||'').toLowerCase().includes(q) ||
             (b.bet||'').toLowerCase().includes(q) ||
             (b.notes||'').toLowerCase().includes(q) ||
             (b.sport||'').toLowerCase().includes(q);
    });
  }
  out = out.reverse();
  document.getElementById('bets-count').textContent = out.length+' bets';

  // ── Desktop table: DocumentFragment build ──
  const tbody = document.getElementById('bets-tbody');
  if (tbody) {
    const frag = document.createDocumentFragment();
    if (!out.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="11" class="empty">No bets logged yet.</td>';
      frag.appendChild(tr);
    } else {
      for (const b of out) {
        const pnl = calcPnl(b);
        const tr = document.createElement('tr');
        const pendingBtns = b.result === 'PENDING'
          ? `<div style="display:flex;gap:3px;align-items:center">${resultTag(b.result)}<button onclick="quickUpdateResult(${b.id},'WIN')" title="Mark WIN" style="background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:4px;padding:1px 5px;font-size:10px;cursor:pointer">W</button><button onclick="quickUpdateResult(${b.id},'LOSS')" title="Mark LOSS" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#ef4444;border-radius:4px;padding:1px 5px;font-size:10px;cursor:pointer">L</button></div>`
          : resultTag(b.result);
        const confCell = b.confidence
          ? `<div style="display:flex;align-items:center;gap:6px"><div class="prog-bar" style="width:60px"><div class="prog-fill" style="width:${b.confidence}%;background:${confColor(b.confidence)}"></div></div><span style="font-size:11px;font-family:var(--mono);color:${confColor(b.confidence)}">${b.confidence}%</span></div>`
          : '—';
        tr.innerHTML = `
          <td style="color:var(--muted);font-family:var(--mono);font-size:11px;white-space:nowrap">${b.date||'—'}</td>
          <td>${sportTag(b.sport||'—')}</td>
          <td style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.event||'—'}</td>
          <td style="color:var(--muted);font-size:12px;white-space:nowrap">${b.bet||'—'}</td>
          <td style="font-family:var(--mono);font-weight:700">$${b.stake||0}</td>
          <td style="font-family:var(--mono);font-weight:700;color:#f59e0b">${b.odds||'?'}x</td>
          <td>${pendingBtns}</td>
          <td style="font-family:var(--mono);font-weight:700;color:${pnl>=0?'#10b981':'#ef4444'}">${fmtPnl(pnl)}</td>
          <td>${confCell}</td>
          <td style="color:var(--muted);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(b.notes||'').replace(/"/g,'&quot;')}">${b.notes||'—'}</td>
          <td><button class="action-btn" onclick="openEdit(${b.id})">edit</button><button class="action-btn del" onclick="confirmDelete(${b.id})">del</button></td>`;
        frag.appendChild(tr);
      }
    }
    tbody.innerHTML = '';
    tbody.appendChild(frag);
  }

  // ── Mobile cards: DocumentFragment build ──
  const cardsEl = document.getElementById('bets-cards');
  if (!cardsEl) return;
  const cardFrag = document.createDocumentFragment();

  if (!out.length) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty';
    emptyDiv.style.cssText = 'padding:40px;text-align:center';
    emptyDiv.innerHTML = `<div style="font-size:40px;margin-bottom:12px">📋</div>
      <div style="font-family:'Oswald',sans-serif;font-size:16px;margin-bottom:8px">NO BETS YET</div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:16px">Start tracking your bets to see your stats here.</div>
      <button class="btn-primary" onclick="openBetForm()">+ Log Your First Bet</button>`;
    cardFrag.appendChild(emptyDiv);
  } else {
    for (const b of out) {
      const pnl = calcPnl(b);
      const pnlColor = pnl >= 0 ? '#10b981' : '#ef4444';
      const card = document.createElement('div');
      card.className = 'bet-card';
      const pendingActions = b.result === 'PENDING' ? `<div style="display:flex;gap:5px;margin-top:8px">
        <button onclick="quickUpdateResult(${b.id},'WIN')" style="flex:1;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:8px;padding:7px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--mono)">✓ WIN</button>
        <button onclick="quickUpdateResult(${b.id},'PLACE')" style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#3b82f6;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--mono)">PLACE</button>
        <button onclick="quickUpdateResult(${b.id},'LOSS')" style="flex:1;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#ef4444;border-radius:8px;padding:7px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--mono)">✗ LOSS</button>
      </div>` : '';
      card.innerHTML = `
        <div class="bet-card-top">${sportTag(b.sport||'—')}<span style="font-size:11px;color:var(--muted);font-family:var(--mono)">${b.date||'—'}</span></div>
        <div class="bet-card-event">${b.event||'—'}</div>
        <div class="bet-card-row">
          <span class="bet-card-type">${b.bet||'—'}</span>
          <span class="bet-card-stake">$${b.stake||0}</span>
          <span class="bet-card-odds">${b.odds||'?'}x</span>
          ${resultTag(b.result||'PENDING')}
          <span class="bet-card-pnl" style="color:${pnlColor}">${fmtPnl(pnl)}</span>
        </div>
        ${pendingActions}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="action-btn" onclick="openEdit(${b.id})" style="flex:1;padding:8px">✏️ Edit</button>
          <button class="action-btn del" onclick="confirmDelete(${b.id})" style="padding:8px 12px">🗑️</button>
        </div>`;
      cardFrag.appendChild(card);
    }
  }
  cardsEl.innerHTML = '';
  cardsEl.appendChild(cardFrag);
}

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
function renderLeaderboard() {
  showLbSport(currentLbSport, null);
}

function showLbSport(sport, btn) {
  currentLbSport = sport;
  if(btn) {
    document.querySelectorAll('#page-leaderboard .filter-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }

  const betList = sport==='overall' ? bets : bets.filter(b=>b.sport===sport);
  const s = getStats(betList);

  // Single user for now (multi-user requires backend)
  const user = { name: 'YOU', profit: s.profit, roi: s.roi, winRate: s.winRate, bets: betList.length, wins: s.wins.length };
  const rankEmoji = ['🥇','🥈','🥉'];

  document.getElementById('lb-content').innerHTML = `
    <div class="lb-card" style="border-color:rgba(16,185,129,.25);background:linear-gradient(90deg,rgba(240,180,41,.05),var(--bg3))">
      <div class="lb-rank" style="color:#10b981">🥇</div>
      <div class="lb-avatar" style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);font-size:24px">🎯</div>
      <div class="lb-info">
        <div class="lb-name">YOUR ACCOUNT <span class="lb-you">YOU</span></div>
        <div class="lb-meta">${user.bets} bets · ${user.wins} wins · ${user.winRate}% WR</div>
        <div class="lb-stats">
          <div><div class="lb-stat-v" style="color:${parseFloat(user.roi)>=0?'#10b981':'#ef4444'}">${user.roi}%</div><div class="lb-stat-l">ROI</div></div>
          <div><div class="lb-stat-v">${user.bets}</div><div class="lb-stat-l">Bets</div></div>
          <div><div class="lb-stat-v">${user.winRate}%</div><div class="lb-stat-l">Win Rate</div></div>
        </div>
      </div>
      <div class="lb-pnl" style="color:${user.profit>=0?'#10b981':'#ef4444'}">${fmtPnl(user.profit)}</div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:20px;text-align:center;margin-top:16px">
      <div style="font-size:32px;margin-bottom:12px">👥</div>
      <div style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px">INVITE YOUR MATES</div>
      <div style="color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:16px">Share this dashboard with friends to compete on the leaderboard. Full multi-user leaderboard requires the hosted version.</div>
      <div style="font-family:var(--mono);font-size:12px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px">${window.location.href}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// ANALYSIS PAGE
// ═══════════════════════════════════════════════════════════════════
function renderAnalysis() {
  const sections = [
    { title:'P&L by Sport', key:'sport', opts:['AFL','NRL','Soccer','UFC','Boxing','Greyhound','Horse Racing'] },
    { title:'P&L by Result Type', key:'result', opts:['WIN','LOSS','PLACE','PUSH','PENDING'] },
    { title:'P&L by Bet Type', key:'betType', opts:['WIN','EACH WAY','PLACE','HEAD TO HEAD','LINE/HANDICAP','OVER/UNDER','MULTI','PROP'] },
    { title:'Value Bet Performance', key:'valueBet', opts:[true,false] },
  ];

  const html = sections.map(({title,key,opts})=>{
    const rows = opts.map(opt=>{
      const grp = bets.filter(b=>String(b[key])===String(opt));
      if(!grp.length) return null;
      const pnl = grp.reduce((s,b)=>s+calcPnl(b),0);
      const wr  = Math.round((grp.filter(b=>b.result==='WIN').length/grp.length)*100);
      const label = key==='valueBet'?(opt?'Value Bets':'Regular Bets'):String(opt);
      const color = SPORT_COLOR[label]||'#10b981';
      return `<div class="analytic-row" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border2)">
        <div style="min-width:130px;font-size:13px;font-weight:700">${label}</div>
        <div style="color:var(--muted);font-size:12px;min-width:56px;font-family:var(--mono)">${grp.length} bets</div>
        <div style="flex:1"><div class="prog-bar"><div class="prog-fill" style="width:${wr}%;background:${wr>=50?'#10b981':'#ef4444'}"></div></div></div>
        <div style="color:${wr>=50?'#10b981':'#f59e0b'};font-size:12px;font-family:var(--mono);min-width:48px">${wr}% WR</div>
        <div style="font-family:var(--mono);font-weight:700;font-size:14px;color:${pnl>=0?'#10b981':'#ef4444'};min-width:80px;text-align:right">${fmtPnl(pnl)}</div>
      </div>`;
    }).filter(Boolean).join('');
    return `<div class="card"><div class="card-header"><div class="card-title">${title}</div></div><div class="card-body">${rows||'<div class="empty">No data yet</div>'}</div></div>`;
  }).join('');

  // AI Rec Performance
  const aiRec = bets.filter(b=>b.aiRecommended);
  const aiStats = getStats(aiRec);
  const allStats = getStats(bets);

  const summaryHtml = `<div class="card"><div class="card-header"><div class="card-title">📊 FULL SUMMARY</div></div><div class="card-body">
    ${[
      {l:'Total Bets',     v:bets.length,              c:'#e8edf2'},
      {l:'Settled Bets',   v:allStats.settled.length,  c:'#e8edf2'},
      {l:'Total Staked',   v:fmt$(allStats.ts),        c:'#f59e0b'},
      {l:'Total Returned', v:fmt$(allStats.tr),        c:'#3b82f6'},
      {l:'Net P&L',        v:fmtPnl(allStats.profit),  c:allStats.profit>=0?'#10b981':'#ef4444'},
      {l:'ROI',            v:allStats.roi+'%',          c:parseFloat(allStats.roi)>=0?'#10b981':'#ef4444'},
      {l:'Win Rate',       v:allStats.winRate+'%',      c:'#3b82f6'},
      {l:'Best Win',       v:allStats.bestWin?`${allStats.bestWin.event} @ ${allStats.bestWin.odds}x`:'—', c:'#f59e0b'},
      {l:'AI Rec Bets',    v:aiRec.length,              c:'#10b981'},
      {l:'AI Rec ROI',     v:aiStats.roi+'%',           c:parseFloat(aiStats.roi)>=0?'#10b981':'#ef4444'},
    ].map(r=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border2)">
      <span style="color:var(--muted);font-size:13px">${r.l}</span>
      <span style="color:${r.c};font-family:var(--mono);font-weight:700;font-size:13px">${r.v}</span>
    </div>`).join('')}
  </div></div>`;

  document.getElementById('analysis-grid').innerHTML = html + summaryHtml;
}

// ═══════════════════════════════════════════════════════════════════
// BET FORM
// ═══════════════════════════════════════════════════════════════════
function openBetForm() {
  editId = null;
  document.getElementById('form-title').textContent = 'LOG NEW BET';
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  ['event','bet','stake','odds','venue','comp','conf','pos','notes'].forEach(id=>{
    const el=document.getElementById('f-'+id); if(el) el.value='';
  });
  ['bettype','bookie','weather'].forEach(id=>{
    const el=document.getElementById('f-'+id); if(el) el.selectedIndex=0;
  });
  const resultEl = document.getElementById('f-result');
  if(resultEl) resultEl.value = 'PENDING';
  document.getElementById('f-value').checked=false;
  document.getElementById('f-ai').checked=false;
  // Pre-fill sport from user profile
  if(currentUser && currentUser.sport) {
    document.getElementById('f-sport').value = currentUser.sport;
  } else {
    const el=document.getElementById('f-sport'); if(el) el.selectedIndex=0;
  }
  document.getElementById('form-overlay').classList.add('show');
}

function openBetFormWithMatch(matchId) {
  const m = UPCOMING.find(x=>String(x.id)===String(matchId));
  if(!m) return;
  openBetForm();
  setTimeout(()=>{
    document.getElementById('f-event').value = `${m.home} vs ${m.away}`;
    document.getElementById('f-venue').value = m.venue;
    document.getElementById('f-comp').value  = m.comp;
    document.getElementById('f-conf').value  = m.confidence;
    document.getElementById('f-bet').value   = m.pick;
    document.getElementById('f-ai').checked  = true;
    const sportEl = document.getElementById('f-sport');
    const sportMap = {'AFL':'AFL','NRL':'NRL','NBA':'NBA','Soccer':'Soccer','UFC':'UFC','Boxing':'Boxing','Greyhound':'Greyhound','Horse Racing':'Horse Racing'};
    if(sportMap[m.sport]) sportEl.value = sportMap[m.sport];
    const oddsVal = m.pick===m.home ? m.homeOdds : m.awayOdds;
    if(oddsVal) document.getElementById('f-odds').value = oddsVal;
    if(m.valueBet) document.getElementById('f-value').checked = true;
  }, 50);
}

function openEdit(id) {
  const b = bets.find(x=>x.id===id); if(!b) return;
  editId = id;
  document.getElementById('form-title').textContent = 'EDIT BET';
  document.getElementById('f-date').value  = b.date;
  document.getElementById('f-event').value = b.event;
  document.getElementById('f-bet').value   = b.bet;
  document.getElementById('f-stake').value = b.stake;
  document.getElementById('f-odds').value  = b.odds;
  document.getElementById('f-venue').value = b.venue||'';
  document.getElementById('f-comp').value  = b.comp||'';
  document.getElementById('f-conf').value  = b.confidence||'';
  document.getElementById('f-pos').value   = b.position||'';
  document.getElementById('f-notes').value = b.notes||'';
  document.getElementById('f-value').checked = !!b.valueBet;
  document.getElementById('f-ai').checked    = !!b.aiRecommended;
  ['sport','result','bettype','bookie','weather'].forEach(fid=>{
    const key={sport:'sport',result:'result',bettype:'betType',bookie:'bookmaker',weather:'weather'}[fid];
    const el=document.getElementById('f-'+fid); if(el&&b[key]) el.value=b[key];
  });
  document.getElementById('form-overlay').classList.add('show');
}

function closeBetForm() {
  document.getElementById('form-overlay').classList.remove('show');
  editId = null;
}

function saveBet() {
  const event = document.getElementById('f-event').value.trim();
  const stake = parseFloat(document.getElementById('f-stake').value);
  const odds  = parseFloat(document.getElementById('f-odds').value);
  if(!event)           { showToast('⚠️ Event name required',false); return; }
  if(isNaN(stake)||stake<=0) { showToast('⚠️ Valid stake required',false); return; }
  if(isNaN(odds)||odds<=0)   { showToast('⚠️ Valid odds required',false); return; }

  const entry = {
    id: editId ?? Date.now(),
    date:     document.getElementById('f-date').value,
    sport:    document.getElementById('f-sport').value,
    event,
    bet:      document.getElementById('f-bet').value,
    stake, odds,
    result:   document.getElementById('f-result').value,
    betType:  document.getElementById('f-bettype').value,
    bookmaker:document.getElementById('f-bookie').value,
    venue:    document.getElementById('f-venue').value,
    comp:     document.getElementById('f-comp').value,
    weather:  document.getElementById('f-weather').value,
    confidence: parseInt(document.getElementById('f-conf').value)||0,
    position: parseInt(document.getElementById('f-pos').value)||'',
    notes:    document.getElementById('f-notes').value,
    valueBet: document.getElementById('f-value').checked,
    aiRecommended: document.getElementById('f-ai').checked,
  };

  if(editId) { bets = bets.map(b=>b.id===editId?entry:b); showToast('✅ Bet updated'); }
  else       { bets.push(entry); showToast('✅ Bet logged'); }
  saveBets();
  closeBetForm();
  renderMyBets();
  renderHome();
}

// ═══════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════
function confirmDelete(id) {
  deleteId = id;
  const b = bets.find(x=>x.id===id);
  document.getElementById('confirm-title').textContent = `Delete bet on "${b?.event}"?`;
  document.getElementById('confirm-ok').onclick = doDelete;
  document.getElementById('confirm-modal').classList.add('show');
}
function doDelete() { bets=bets.filter(b=>b.id!==deleteId); saveBets(); closeConfirm(); renderMyBets(); showToast('🗑️ Deleted',false); }
function closeConfirm() { document.getElementById('confirm-modal').classList.remove('show'); deleteId=null; }

// ═══════════════════════════════════════════════════════════════════
// AI ANALYSIS MODAL
// ═══════════════════════════════════════════════════════════════════
function closeMatchModal() { document.getElementById('match-modal').classList.remove('show'); }

// ── FUN FACTS / DID YOU KNOW cycler ──
const BETTING_FACTS = [
  "The favourite wins only ~33% of horse races — value is everything, not picking winners.",
  "The Kelly Criterion suggests betting no more than 2–5% of your bankroll per event.",
  "Line movement after 8 pm often signals sharp (professional) money, not casual bettors.",
  "In AFL, teams leading at half-time go on to win the match about 72% of the time.",
  "Home teams in the NRL cover the spread less than 50% of the time on average.",
  "The bookmaker's overround (margin) on head-to-head markets is typically 4–8%.",
  "Tracking your ROI over 500+ bets is the only reliable way to measure your edge.",
  "Rain in AFL significantly increases contested possessions and lowers scoring.",
  "Caulfield Cup runners drawn barriers 1–6 win at a 40% higher rate.",
  "A 3% ROI sustained over 1,000 bets puts you in the top 5% of all sports bettors.",
  "Dogs with fast early speed win Group 1 sprints 55% more often at tight tracks.",
  "NRL teams playing their 3rd game in 11 days cover the spread only 38% of the time.",
  "The best long-term value is often found in markets with fewer than 4 outcomes.",
  "Closing line value (CLV) is the gold standard for measuring if a bet was good.",
  "Backing underdogs in head-to-head markets outperforms favourites in the long run."
];
let _factTimer = null;
let _factIdx = 0;
function startFactCycler() {
  const box  = document.getElementById('md-fun-fact');
  const text = document.getElementById('md-fun-fact-text');
  if (!box || !text) return;
  _factIdx = Math.floor(Math.random() * BETTING_FACTS.length);
  text.textContent = BETTING_FACTS[_factIdx];
  box.style.display = 'block';
  box.style.opacity = '1';
  _factTimer = setInterval(() => {
    _factIdx = (_factIdx + 1) % BETTING_FACTS.length;
    box.style.opacity = '0';
    setTimeout(() => {
      text.textContent = BETTING_FACTS[_factIdx];
      box.style.opacity = '1';
    }, 300);
  }, 3500);
}
function stopFactCycler() {
  if (_factTimer) { clearInterval(_factTimer); _factTimer = null; }
  const box = document.getElementById('md-fun-fact');
  if (box) box.style.display = 'none';
}

async function requestAIAnalysis(m) {
  const token = localStorage.getItem('edgeiq-token-v2');
  if (!token) return;
  startFactCycler();
  try {
    const extraMkts = generateExtraMarkets(m);
    let playerMarkets = null;
    if (m.sport === 'AFL') {
      const fg = extraMkts.find(x => x.id === 'firstgoal');
      const d20 = extraMkts.find(x => x.id === '20dis');
      playerMarkets = { firstGoal: fg?.outcomes.map(o => o.label) || [], disposals: d20?.outcomes.map(o => o.label) || [] };
    } else if (m.sport === 'NRL') {
      const ft = extraMkts.find(x => x.id === 'firsttry');
      playerMarkets = { tryscorers: ft?.outcomes.map(o => o.label) || [] };
    } else if (m.sport === 'NBA') {
      const p20 = extraMkts.find(x => x.id === 'pts20');
      playerMarkets = { pointsPlayers: p20?.outcomes.map(o => o.label) || [] };
    }
    const res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify({ event: { id: m.id, home: m.home, away: m.away, sport: m.sport, homeOdds: m.homeOdds, awayOdds: m.awayOdds, drawOdds: m.drawOdds }, playerMarkets })
    });
    const data = await res.json();
    if (data.success && data.analysis) {
      const idx = UPCOMING.findIndex(x => x.id === m.id);
      if (idx !== -1) {
        UPCOMING[idx].aiReady = true;
        UPCOMING[idx].recommendation = data.analysis.recommendation || UPCOMING[idx].pick;
        UPCOMING[idx].confidence = data.analysis.confidence || UPCOMING[idx].confidence;
        UPCOMING[idx].reasoning = data.analysis.reasoning || data.analysis.summary || '';
        UPCOMING[idx].summary = data.analysis.summary || '';
        UPCOMING[idx].form = data.analysis.form || null;
        UPCOMING[idx].headToHead = data.analysis.headToHead || '';
        UPCOMING[idx].venueEdge = data.analysis.venueEdge || '';
        UPCOMING[idx].keyFactors = data.analysis.keyFactors || [];
        UPCOMING[idx].keyFactor = data.analysis.keyFactor || '';
        UPCOMING[idx].bettingAngle = data.analysis.bettingAngle || '';
        UPCOMING[idx].valueBet = data.analysis.valueBet != null ? data.analysis.valueBet : UPCOMING[idx].valueBet;
        UPCOMING[idx].props = data.analysis.props || null;
        UPCOMING[idx].playerPicks = data.analysis.playerPicks || null;
        UPCOMING[idx].pick = data.analysis.recommendation || UPCOMING[idx].pick;
      }
      stopFactCycler();
      if (document.getElementById('match-modal').classList.contains('show')) {
        openMatchModal(m.id);
      }
    } else {
      stopFactCycler();
      const el = document.getElementById('md-ai-loading');
      if (el) {
        if (res.status === 401) {
          el.innerHTML = '🔒 Session expired — please <a href="#" onclick="closeMatchModal();doLogout();return false" style="color:var(--accent);text-decoration:underline">sign in again</a>';
        } else if (data?.errorType === 'credits') {
          el.innerHTML = '💳 AI credits exhausted — add credits at <a href="https://console.anthropic.com" target="_blank" style="color:var(--accent);text-decoration:underline">console.anthropic.com</a> then reload';
        } else {
          el.textContent = '🤖 AI analysis unavailable — try again later';
        }
      }
    }
  } catch(e) {
    stopFactCycler();
    console.error('AI analysis request failed:', e);
    const el = document.getElementById('md-ai-loading');
    if (el) el.textContent = '🤖 AI analysis unavailable — check connection';
  }
}

// ── Odds button: haptic flash then open modal ──
function selectOdd(el, matchId) {
  el.classList.add('pressed');
  if (navigator.vibrate) navigator.vibrate(40);
  setTimeout(() => {
    el.classList.remove('pressed');
    openMatchModal(matchId);
  }, 160);
}

// ── Bold key terms in AI analysis text ──
function formatAIBold(text) {
  if (!text) return '';
  return text
    .replace(/([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*):\s/g, '<strong>$1:</strong> ')
    .replace(/(\+[\d.]+%?|\-[\d.]+%?)/g, '<strong>$1</strong>')
    .replace(/([\d.]+%)/g, '<strong>$1</strong>')
    .replace(/\b(WIN|LOSS|DRAW|PICK|VALUE|BET|EDGE|AVOID)\b/g, '<strong>$1</strong>')
    .replace(/\(([^)]{3,40})\)/g, '(<em>$1</em>)')
    .replace(/\. ([A-Z])/g, '.<br>$1');
}

// ═══════════════════════════════════════════════════════════════════
// EXTRA MARKETS
// ═══════════════════════════════════════════════════════════════════


function _emRand(seed) {
  let s = Math.abs(String(seed).split('').reduce((a,c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  if (!s) s = 99991;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 4294967296; };
}
function _emFl(v) { return Math.round(v * 100) / 100; }
function _emPickN(arr, n, rand) {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function generateExtraMarkets(m) {
  if (!m || m.isRacing) return [];
  const rand = _emRand(m.id);
  const fl = _emFl;
  const pickN = (arr, n) => _emPickN(arr, n, rand);
  const rOdds = (base, spread = 0.08) => fl(Math.max(1.01, base + (rand() - 0.5) * spread));

  const homeOdds = m.homeOdds || 2, awayOdds = m.awayOdds || 2;
  const homeProb = (1 / homeOdds) / (1 / homeOdds + 1 / awayOdds);
  const probDiff = homeProb - 0.5;
  const favTeam = probDiff >= 0 ? m.home : m.away;
  const dogTeam = probDiff >= 0 ? m.away : m.home;
  const favOdds = Math.min(homeOdds, awayOdds);
  const dogOdds = Math.max(homeOdds, awayOdds);
  const markets = [];

  if (m.sport === 'AFL') {
    // AFL: ~100 pts per unit of normalised prob diff (e.g. 0.294 → ~29.5)
    const linePts = (Math.round(Math.abs(probDiff) * 100 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'line', name:'🏈 Line', outcomes: [
      { label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },
      { label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }
    ]});
    const ou = Math.round((155 + rand() * 40) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [
      { label: `Over ${ou}`, odds: rOdds(1.90) },
      { label: `Under ${ou}`, odds: rOdds(1.90) }
    ]});
    markets.push({ id:'margin', name:'🎯 Winning Margin', outcomes: [
      { label: `${favTeam} 1–39`, odds: fl(favOdds * 0.84 + rand() * 0.06) },
      { label: `${favTeam} 40+`, odds: fl(favOdds * 2.7 + rand() * 0.3) },
      { label: `${dogTeam} 1–39`, odds: fl(dogOdds * 0.84 + rand() * 0.08) },
      { label: `${dogTeam} 40+`, odds: fl(dogOdds * 4.2 + rand() * 0.5) },
      { label: 'Draw', odds: rOdds(61, 8) }
    ]});
    const fwdsA = pickN(AFL_FWDS, 5).map(n => ({ label: n, odds: fl(8 + rand() * 14) }));
    const fwdsB = pickN(AFL_FWDS.filter(p => !fwdsA.map(x=>x.label).includes(p)), 5).map(n => ({ label: n, odds: fl(8 + rand() * 14) }));
    const fgAll = [...fwdsA, ...fwdsB].sort((a,b) => a.odds - b.odds).slice(0, 10);
    markets.push({ id:'firstgoal', name:'🥅 First Goal Scorer', outcomes: fgAll });
    markets.push({ id:'2goals', name:'⚽ Anytime Goal Scorer (2+)', outcomes:
      fgAll.map(p => ({ label: p.label, odds: fl(p.odds * 0.5 + rand() * 0.15) })).sort((a,b) => a.odds - b.odds)
    });
    const midsA = pickN(AFL_MIDS, 4).map(n => ({ label: n, odds: rOdds(1.12 + rand() * 0.35, 0.04) }));
    const midsB = pickN(AFL_MIDS.filter(p => !midsA.map(x=>x.label).includes(p)), 4).map(n => ({ label: n, odds: rOdds(1.12 + rand() * 0.35, 0.04) }));
    const d20all = [...midsA, ...midsB].sort((a,b) => a.odds - b.odds);
    markets.push({ id:'20dis', name:'📋 20+ Disposals', outcomes: d20all });
    markets.push({ id:'25dis', name:'📋 25+ Disposals', outcomes:
      d20all.map(p => ({ label: p.label, odds: fl(p.odds * 1.5 + rand() * 0.2) })).sort((a,b) => a.odds - b.odds)
    });

  } else if (m.sport === 'NRL') {
    // NRL: ~48 pts per unit (e.g. 0.20 → ~9.5)
    const linePts = (Math.round(Math.abs(probDiff) * 48 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'line', name:'🏉 Line', outcomes: [
      { label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },
      { label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }
    ]});
    const ou = Math.round((38 + rand() * 14) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [
      { label: `Over ${ou}`, odds: rOdds(1.90) },
      { label: `Under ${ou}`, odds: rOdds(1.90) }
    ]});
    const tryers = pickN([...NRL_BACKS, ...NRL_HALVES], 10);
    const fts = tryers.slice(0, 10).map(n => ({ label: n, odds: fl(7 + rand() * 12) })).sort((a,b) => a.odds - b.odds).slice(0, 8);
    markets.push({ id:'firsttry', name:'🏃 First Try Scorer', outcomes: fts });
    markets.push({ id:'anytry', name:'🏃 Anytime Try Scorer', outcomes:
      fts.map(p => ({ label: p.label, odds: fl(p.odds * 0.42 + rand() * 0.1) })).sort((a,b) => a.odds - b.odds)
    });

  } else if (m.sport === 'NBA') {
    // NBA: ~90 pts per unit (e.g. 0.15 → ~13.5)
    const linePts = (Math.round(Math.abs(probDiff) * 90 / 0.5) * 0.5) + 0.5;
    markets.push({ id:'spread', name:'🏀 Point Spread', outcomes: [
      { label: `${favTeam} -${linePts}`, odds: rOdds(1.90) },
      { label: `${dogTeam} +${linePts}`, odds: rOdds(1.90) }
    ]});
    const ou = Math.round((210 + rand() * 30) * 2) / 2;
    markets.push({ id:'ou', name:'📊 Total Points O/U', outcomes: [
      { label: `Over ${ou}`, odds: rOdds(1.90) },
      { label: `Under ${ou}`, odds: rOdds(1.90) }
    ]});
    const stars = pickN(NBA_POOL, 6);
    markets.push({ id:'pts20', name:'🏀 Player 20+ Points', outcomes:
      stars.map(n => ({ label: n, odds: rOdds(1.72 + rand() * 0.7, 0.06) })).sort((a,b) => a.odds - b.odds)
    });
    markets.push({ id:'pts30', name:'🏀 Player 30+ Points', outcomes:
      stars.map(n => ({ label: n, odds: rOdds(3.5 + rand() * 1.5, 0.1) })).sort((a,b) => a.odds - b.odds)
    });

  } else if (m.sport === 'Soccer') {
    markets.push({ id:'ah', name:'⚽ Asian Handicap -0.5', outcomes: [
      { label: `${favTeam} -0.5`, odds: rOdds(1.88, 0.1) },
      { label: `${dogTeam} +0.5`, odds: rOdds(1.95, 0.1) }
    ]});
    markets.push({ id:'ou25', name:'🎯 Total Goals O/U 2.5', outcomes: [
      { label: 'Over 2.5', odds: rOdds(1.85, 0.08) },
      { label: 'Under 2.5', odds: rOdds(1.98, 0.08) }
    ]});
    markets.push({ id:'ou35', name:'🎯 Total Goals O/U 3.5', outcomes: [
      { label: 'Over 3.5', odds: rOdds(2.65, 0.15) },
      { label: 'Under 3.5', odds: rOdds(1.46, 0.1) }
    ]});
    markets.push({ id:'btts', name:'🥅 Both Teams to Score', outcomes: [
      { label: 'Yes', odds: rOdds(1.72, 0.08) },
      { label: 'No', odds: rOdds(2.08, 0.1) }
    ]});
    markets.push({ id:'htft', name:'⏱️ Half-Time / Full-Time', outcomes: [
      { label: `${m.home} / ${m.home}`, odds: fl(favOdds * 1.55 + rand() * 0.1) },
      { label: `${m.away} / ${m.away}`, odds: fl(dogOdds * 1.55 + rand() * 0.15) },
      { label: 'Draw / Draw', odds: rOdds(3.8, 0.3) },
      { label: `Draw / ${m.home}`, odds: rOdds(5.5, 0.5) },
      { label: `Draw / ${m.away}`, odds: rOdds(6.5, 0.5) }
    ]});

  } else if (m.sport === 'UFC' || m.sport === 'Boxing') {
    const movOutcomes = [
      { label: `${m.home} by KO/TKO`, odds: fl(favOdds * 0.74 + rand() * 0.1) },
      { label: `${m.home} by Decision`, odds: fl(favOdds * 0.88 + rand() * 0.08) },
      { label: `${m.away} by KO/TKO`, odds: fl(dogOdds * 0.74 + rand() * 0.12) },
      { label: `${m.away} by Decision`, odds: fl(dogOdds * 0.88 + rand() * 0.1) }
    ];
    if (m.sport === 'UFC') {
      movOutcomes.splice(2, 0, { label: `${m.home} by Submission`, odds: fl(favOdds * 1.3 + rand() * 0.15) });
      movOutcomes.push({ label: `${m.away} by Submission`, odds: fl(dogOdds * 1.3 + rand() * 0.15) });
    }
    markets.push({ id:'mov', name:'🥊 Method of Victory', outcomes: movOutcomes });
    markets.push({ id:'dist', name:'⏱️ Goes the Distance', outcomes: [
      { label: 'Yes', odds: rOdds(1.75, 0.12) },
      { label: 'No', odds: rOdds(2.00, 0.12) }
    ]});
    const rounds = m.sport === 'Boxing' ? 6 : 4;
    markets.push({ id:'round', name:'🎯 Round Betting', outcomes:
      Array.from({length: rounds}, (_, i) => ({ label: `Ends in Round ${i+1}`, odds: fl(8 + i * 1.8 + rand() * 1.2) }))
    });
  }

  return markets;
}

// Returns a small AI pick badge HTML for a given market, or '' if no pick available
function getMarketAIPick(m, marketId) {
  const p = m.props;
  const pp = m.playerPicks;
  if (!m.aiReady) return { badge: '', reason: '', pick: null };
  const badge = (label) => `<span style="font-size:9px;background:rgba(139,92,246,.18);color:#a78bfa;border:1px solid rgba(139,92,246,.35);border-radius:4px;padding:2px 6px;font-weight:700;letter-spacing:.5px;margin-left:6px">🤖 ${label}</span>`;
  if (p) {
    if (marketId === 'ou' && p.ou) return { badge: badge(p.ou.toUpperCase()), reason: p.ouReason || '', pick: null };
    if (marketId === 'ou25' && p.ou) return { badge: badge(p.ou === 'over' ? 'OVER 2.5' : 'UNDER 2.5'), reason: p.ouReason || '', pick: null };
    if (marketId === 'ou35' && p.ou) return { badge: badge(p.ou === 'over' ? 'OVER 3.5' : 'UNDER 3.5'), reason: '', pick: null };
    if (marketId === 'margin' && p.margin) return { badge: badge(p.margin.toUpperCase()), reason: '', pick: null };
    if (marketId === 'btts' && p.btts) return { badge: badge('BTTS: ' + p.btts.toUpperCase()), reason: '', pick: null };
    if (marketId === 'mov' && p.mov) return { badge: badge(p.mov), reason: '', pick: null };
    if (marketId === 'dist' && p.dist) return { badge: badge(p.dist === 'yes' ? 'GOES DISTANCE' : 'EARLY FINISH'), reason: p.distReason || '', pick: null };
  }
  if (pp) {
    if (marketId === 'firstgoal' && pp.firstGoal) return { badge: badge(pp.firstGoal), reason: 'AI pick: most likely first goal scorer', pick: pp.firstGoal };
    if (marketId === '2goals' && pp.anyGoal) return { badge: badge(pp.anyGoal), reason: 'AI pick: most likely to kick 2+ goals', pick: pp.anyGoal };
    if (marketId === '20dis' && pp.dis20) return { badge: badge(pp.dis20), reason: 'AI pick: most likely 20+ disposals', pick: pp.dis20 };
    if (marketId === '25dis' && pp.dis25) return { badge: badge(pp.dis25), reason: 'AI pick: most likely 25+ disposals', pick: pp.dis25 };
    if (marketId === 'firsttry' && pp.firstTry) return { badge: badge(pp.firstTry), reason: 'AI pick: most likely first try scorer', pick: pp.firstTry };
    if (marketId === 'anytry' && pp.anyTry) return { badge: badge(pp.anyTry), reason: 'AI pick: most likely anytime try scorer', pick: pp.anyTry };
    if (marketId === 'pts20' && pp.pts20) return { badge: badge(pp.pts20), reason: 'AI pick: most likely to score 20+ points', pick: pp.pts20 };
    if (marketId === 'pts30' && pp.pts30) return { badge: badge(pp.pts30), reason: 'AI pick: most likely to score 30+ points', pick: pp.pts30 };
  }
  return { badge: '', reason: '', pick: null };
}

function renderExtraMarkets(m) {
  const markets = generateExtraMarkets(m);
  if (!markets.length) return '';
  return `
    <div style="margin-bottom:16px">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">📊 EXTRA MARKETS</div>
      ${markets.map((mkt, idx) => {
        const ai = getMarketAIPick(m, mkt.id);
        return `
        <div class="em-market">
          <div class="em-title" onclick="toggleEM('${mkt.id}')" data-testid="em-header-${mkt.id}">
            <span style="display:flex;align-items:center;gap:0;flex-wrap:wrap">${mkt.name}${ai.badge}</span>
            <span id="em-chev-${mkt.id}" style="font-size:10px;color:var(--muted);flex-shrink:0">${idx === 0 ? '▲' : '▼'}</span>
          </div>
          <div class="em-body" id="em-body-${mkt.id}" style="${idx === 0 ? '' : 'display:none'}">
            <div class="em-2col">
              ${mkt.outcomes.map(o => {
                const isAIPick = ai.badge && (
                  (mkt.id==='ou' && o.label.toLowerCase().startsWith(m.props?.ou||'__')) ||
                  (mkt.id==='ou25' && o.label.toLowerCase().includes(m.props?.ou||'__')) ||
                  (mkt.id==='ou35' && o.label.toLowerCase().includes(m.props?.ou||'__')) ||
                  (mkt.id==='margin' && m.props?.margin && o.label.replace(/\u2013/g,'-') === m.props.margin.replace(/\u2013/g,'-')) ||
                  (mkt.id==='btts' && o.label.toLowerCase() === (m.props?.btts||'__')) ||
                  (mkt.id==='mov' && o.label === m.props?.mov) ||
                  (mkt.id==='dist' && ((m.props?.dist==='yes'&&o.label==='Yes')||(m.props?.dist==='no'&&o.label==='No'))) ||
                  (ai.pick && o.label === ai.pick)
                );
                const _inSlip = isInSlip(String(m.id), mkt.id, o.label);
                const _safeLabel = (o.label||'').replace(/'/g,"\\'");
                const _safeMkt = mkt.name.replace(/'/g,"\\'");
                const _safeMatchEM = (m.home + ' vs ' + m.away).replace(/'/g,"\\'");
                return `
                <div class="em-outcome${isAIPick ? ' em-ai-pick' : ''}${_inSlip ? ' in-slip' : ''}" data-testid="em-outcome-${mkt.id}" style="display:flex;align-items:center;gap:6px">
                  <button onclick="openMarketBet('${m.id}','${_safeLabel}',${_emFl(o.odds)})" style="flex:1;background:none;border:none;padding:0;text-align:left;cursor:pointer;min-width:0;-webkit-tap-highlight-color:transparent">
                    <div class="em-outcome-label">${o.label}${isAIPick ? ' 🤖' : ''}</div>
                    <div class="em-outcome-odds">${_emFl(o.odds)}x</div>
                  </button>
                  <button class="slip-pill${_inSlip?' added':''}" onclick="event.stopPropagation();addToSlip('${m.id}','${_safeMatchEM}','${m.sport}','${_safeMkt}','${_safeLabel}',${_emFl(o.odds)},this)" title="${_inSlip?'Remove from slip':'Add to slip'}">${_inSlip?'✓':'+'}</button>
                </div>`;
              }).join('')}
            </div>
            ${ai.reason ? `<div style="font-size:11px;color:#a78bfa;padding:6px 10px 8px;border-top:1px solid rgba(139,92,246,.2);background:rgba(139,92,246,.04);line-height:1.4">🤖 ${ai.reason}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function toggleEM(id) {
  const body = document.getElementById('em-body-' + id);
  const chev = document.getElementById('em-chev-' + id);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.textContent = isOpen ? '▼' : '▲';
}

function openMarketBet(matchId, label, odds) {
  const m = UPCOMING.find(x => String(x.id) === String(matchId));
  if (!m) return;
  quickBetMatch = { ...m, _marketLabel: label, _marketOdds: odds };
  document.getElementById('qb-match-label').textContent = `${m.home} vs ${m.away} · ${m.time}`;
  document.getElementById('qb-pick-label').textContent = 'SELECTION';
  document.getElementById('qb-pick').textContent = label;
  document.getElementById('qb-odds').textContent = odds + 'x';
  document.getElementById('qb-runner-selector').style.display = 'none';
  document.getElementById('qb-runner-select').innerHTML = '';
  document.getElementById('qb-stake').value = '';
  document.getElementById('qb-result').value = 'PENDING';
  document.getElementById('quick-bet-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('qb-stake').focus(), 100);
}

function openMatchModal(matchId) {
  const m = UPCOMING.find(x=>String(x.id)===String(matchId));
  if(!m) return;

  const sc = SPORT_COLOR[m.sport]||'#aaa';
  const ai = m.aiReady ? {
    summary: m.summary || m.reasoning || '',
    form: m.form || null,
    headToHead: m.headToHead || '',
    venueEdge: m.venueEdge || '',
    keyFactors: m.keyFactors?.length ? m.keyFactors : (m.keyFactor ? [{icon:'🔑', label:'Key Factor', value: m.keyFactor}] : []),
    bettingAngle: m.bettingAngle || ''
  } : null;
  const confCol = confColor(m.confidence);

  // Header
  if (m.isRacing) {
    document.getElementById('md-title').textContent = m.raceName || `R${m.raceNumber} ${m.venue}`;
    const subtitleParts = [m.time, m.comp, m.distanceLabel || `${m.distance}m`];
    if (m.going) subtitleParts.push(m.going);
    if (m.prizeTotal) subtitleParts.push(`$${Number(m.prizeTotal).toLocaleString()}`);
    document.getElementById('md-subtitle').textContent = subtitleParts.join(' · ');
  } else {
    document.getElementById('md-title').textContent = `${m.home} vs ${m.away}`;
    document.getElementById('md-subtitle').textContent = `${m.time} · ${m.comp}`;
  }
  document.getElementById('md-sport-tag').innerHTML = `<span style="background:${sc}22;color:${sc};border:1px solid ${sc}44;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;letter-spacing:1px">${m.sport}</span>`;

  let oddsRow;
  if (m.isRacing && m.runners) {
    const liveTag = m.isLiveData ? '<span style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.3);border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:1px;margin-left:8px">LIVE ODDS</span>' : '';
    const speedMap = buildSpeedMap(m.runners, m.sport);
    const posCol = { 'Leader':'#00ffa3','On-pace':'#10b981','Midfield':'#3b82f6','Back':'#8b5cf6' };
    oddsRow = `
    ${speedMap.html}
    <div style="margin-bottom:20px">
      <div style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:10px;font-weight:600">RUNNERS · ${m.runners.length} starters${liveTag}</div>
      <div style="max-height:420px;overflow-y:auto;border:1px solid var(--border);border-radius:10px" data-testid="runners-table">
        ${m.runners.map((r, i) => {
          const oddsDir = r.oddsOpen ? (r.odds < r.oddsOpen ? '↓' : r.odds > r.oddsOpen ? '↑' : '') : '';
          const oddsDirCol = r.odds < r.oddsOpen ? '#10b981' : r.odds > r.oddsOpen ? '#ef4444' : '';
          const l5 = r.last5 ? r.last5.split('-').map(c => {
            const col = c==='W'?'#10b981':c==='P'?'#f59e0b':'#ef4444';
            return `<span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:3px;font-size:9px;font-weight:700;background:${col}22;color:${col}">${c}</span>`;
          }).join('') : '';
          const racePos = speedMap.positions[r.name];
          const posBadge = racePos ? `<span style="font-size:8px;font-weight:700;letter-spacing:.5px;color:${posCol[racePos]};background:${posCol[racePos]}18;border:1px solid ${posCol[racePos]}40;border-radius:3px;padding:1px 5px">${racePos}</span>` : '';
          return `
        <div style="padding:10px 14px;${i>0?'border-top:1px solid var(--border)':''}${i===0?'background:rgba(16,185,129,.05)':''}" data-testid="runner-row-${i}">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:24px;font-family:var(--mono);font-size:12px;color:var(--muted);font-weight:600;text-align:center">${r.barrier||'-'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:${i===0?'700':'500'};color:var(--text);display:flex;align-items:center;gap:6px;flex-wrap:wrap">${r.name}${i===0?' <span style="font-size:10px;color:#10b981;letter-spacing:1px">FAV</span>':''}${posBadge}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;display:flex;flex-wrap:wrap;gap:4px 10px">
                ${r.jockey?`<span>J: ${r.jockey}</span>`:''}${r.trainer?`<span>T: ${r.trainer}</span>`:''}${r.weight?`<span>${r.weight}kg</span>`:''}${r.age?`<span>${r.age}</span>`:''}
              </div>
            </div>
            <div style="text-align:right;min-width:56px">
              <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:${i===0?'#00ffa3':'var(--text)'}">${r.odds < 99 ? r.odds.toFixed(2) : '—'}</div>
              ${r.oddsOpen && oddsDir ? `<div style="font-size:9px;font-family:var(--mono);color:${oddsDirCol}">${oddsDir} ${r.oddsOpen.toFixed(2)}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;margin-left:32px;flex-wrap:wrap">
            ${l5 ? `<div style="display:flex;gap:2px">${l5}</div>` : ''}
            ${r.career ? `<span style="font-size:9px;color:var(--muted);font-family:var(--mono)">${r.career}</span>` : ''}
            ${r.daysSinceRun ? `<span style="font-size:9px;color:var(--muted)">Last: ${r.daysSinceRun}d ago</span>` : ''}
            ${r.careerEarnings ? `<span style="font-size:9px;color:var(--muted)">$${Number(r.careerEarnings).toLocaleString()}</span>` : ''}
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>`;
  } else {
    const _safeMatch = (m.home + ' vs ' + m.away).replace(/'/g,"\\'");
    oddsRow = `
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <div style="flex:1;background:var(--bg);border:1px solid ${m.pick===m.home?'rgba(240,180,41,.4)':'var(--border)'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">HOME</div>
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">${m.home}</div>
        <div style="font-size:22px;font-weight:700;color:${m.pick===m.home?'#00ffa3':'var(--text)'}">${m.homeOdds||'—'}</div>
        ${m.pick===m.home?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ AI PICK</div>`:''}
        ${m.homeOdds?`<button class="slip-add-btn${isInSlip(String(m.id),'H2H',m.home)?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','${m.home.replace(/'/g,"\\'")}',${m.homeOdds},this)">${isInSlip(String(m.id),'H2H',m.home)?'✓ IN SLIP':'+ ADD TO SLIP'}</button>`:''}
      </div>
      ${m.drawOdds?`
      <div style="flex:1;background:var(--bg);border:1px solid ${m.pick==='Draw'?'rgba(240,180,41,.4)':'var(--border)'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">DRAW</div>
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">Draw</div>
        <div style="font-size:22px;font-weight:700;color:${m.pick==='Draw'?'#00ffa3':'var(--text)'}">${m.drawOdds}</div>
        ${m.pick==='Draw'?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ AI PICK</div>`:''}
        <button class="slip-add-btn${isInSlip(String(m.id),'H2H','Draw')?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','Draw',${m.drawOdds},this)">${isInSlip(String(m.id),'H2H','Draw')?'✓ IN SLIP':'+ ADD TO SLIP'}</button>
      </div>`:''}
      <div style="flex:1;background:var(--bg);border:1px solid ${m.pick===m.away?'rgba(240,180,41,.4)':'var(--border)'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">AWAY</div>
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">${m.away}</div>
        <div style="font-size:22px;font-weight:700;color:${m.pick===m.away?'#00ffa3':'var(--text)'}">${m.awayOdds||'—'}</div>
        ${m.pick===m.away?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ AI PICK</div>`:''}
        ${m.awayOdds?`<button class="slip-add-btn${isInSlip(String(m.id),'H2H',m.away)?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','${m.away.replace(/'/g,"\\'")}',${m.awayOdds},this)">${isInSlip(String(m.id),'H2H',m.away)?'✓ IN SLIP':'+ ADD TO SLIP'}</button>`:''}
      </div>
    </div>`;
  }

  const aiSection = m.isRacing ? '' : ai ? `
    <div style="background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.15);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:18px">🤖</span>
        <span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;color:#10b981">AI ANALYSIS</span>
        <span style="margin-left:auto;font-family:var(--mono);font-size:12px;color:${confCol};font-weight:700">${m.confidence}% CONF</span>
      </div>
      ${ai.summary ? `<div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(16,185,129,.12)">${ai.summary}</div>` : ''}
      ${(ai.form?.home || ai.form?.away) ? `
      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">📈 RECENT FORM</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:600">${m.home}</div>
            <div style="font-size:12px;color:var(--text);line-height:1.5">${ai.form.home}</div>
          </div>
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:600">${m.away}</div>
            <div style="font-size:12px;color:var(--text);line-height:1.5">${ai.form.away}</div>
          </div>
        </div>
      </div>` : ''}
      ${ai.headToHead ? `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:4px">🆚 HEAD TO HEAD</div>
        <div style="font-size:12px;color:var(--text);line-height:1.5">${ai.headToHead}</div>
      </div>` : ''}
      ${ai.venueEdge ? `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:4px">🏟️ VENUE</div>
        <div style="font-size:12px;color:var(--text);line-height:1.5">${ai.venueEdge}</div>
      </div>` : ''}
      ${ai.keyFactors?.length ? `
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">🔑 KEY FACTORS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${ai.keyFactors.map(f=>`
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:3px">${f.icon} ${f.label?.toUpperCase()}</div>
            <div style="font-size:12px;color:var(--text);line-height:1.4">${f.value}</div>
          </div>`).join('')}
        </div>
      </div>` : ''}
      ${ai.bettingAngle ? `
      <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:8px;padding:10px">
        <div style="font-size:10px;color:#10b981;letter-spacing:1.5px;font-weight:700;margin-bottom:4px">💡 BETTING ANGLE</div>
        <div style="font-size:12px;color:var(--text);line-height:1.7">${formatAIBold(ai.bettingAngle)}</div>
      </div>` : ''}
    </div>` : `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;text-align:center">
      <div style="font-size:22px;margin-bottom:8px">🤖</div>
      <div id="md-ai-loading" style="font-size:11px;color:var(--muted);letter-spacing:1px">Loading AI analysis...</div>
      <div id="md-fun-fact" style="margin-top:14px;padding:12px;background:rgba(240,180,41,.05);border:1px solid rgba(16,185,129,.12);border-radius:8px;font-size:12px;color:var(--muted);line-height:1.6;text-align:left;display:none">
        <span style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--accent);display:block;margin-bottom:4px">📊 DID YOU KNOW?</span>
        <span id="md-fun-fact-text"></span>
      </div>
    </div>`;

  const needsPlayerPicks = ['AFL','NRL','NBA'].includes(m.sport) && !m.playerPicks;
  const needsProps = ['AFL','NRL','NBA','Soccer'].includes(m.sport) && !m.props;
  if (!m.isRacing && (!m.aiReady || needsPlayerPicks || needsProps)) {
    requestAIAnalysis(m);
  }

  const valueBadge = m.valueBet ? `<div class="value-bet-badge" style="margin-bottom:16px">💰 VALUE BET DETECTED</div>` : '';

  const extraMarketsHtml = m.isRacing ? '' : renderExtraMarkets(m);

  document.getElementById('md-body').innerHTML = `
    ${oddsRow}
    ${extraMarketsHtml}
    ${valueBadge}
    ${aiSection}
    <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">
      <button class="btn-primary" style="flex:1;min-width:120px" onclick="closeMatchModal();openQuickBet('${m.id}')">+ LOG BET</button>
      <button onclick="closeMatchModal();openBookieSheet('${m.id}','${(m.pick||'').replace(/'/g,"\\'")}','${m.pick===m.home?m.homeOdds:m.pick===m.away?m.awayOdds:m.drawOdds||''}','${m.sport}','')" style="flex:1;min-width:140px;background:rgba(0,91,212,.14);border:1px solid rgba(0,91,212,.45);color:#60a5fa;border-radius:10px;padding:12px 16px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .15s;white-space:nowrap" onmouseover="this.style.background='rgba(0,91,212,.25)'" onmouseout="this.style.background='rgba(0,91,212,.14)'">🏦 PLACE AT BOOKIE</button>
      <button data-testid="button-share-pick" onclick="shareAIPick('${m.id}')" style="background:var(--bg);border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:12px 16px;cursor:pointer;font-size:18px;transition:all .15s;min-width:48px;min-height:48px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation" title="Share this pick" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">📤</button>
    </div>
  `;

  document.getElementById('match-modal').classList.add('show');
}

function openMatchAnalysis(matchId) { openMatchModal(matchId); }

function openAIAnalysis() {
  document.getElementById('ai-input-form').style.display='block';
  document.getElementById('ai-result-area').style.display='none';
  document.getElementById('ai-modal').classList.add('show');
}
function closeAIModal() { document.getElementById('ai-modal').classList.remove('show'); }

async function runAIAnalysis() {
  const sport   = document.getElementById('ai-sport').value;
  const team1   = document.getElementById('ai-team1').value.trim();
  const team2   = document.getElementById('ai-team2').value.trim();
  const odds1   = document.getElementById('ai-odds1').value;
  const odds2   = document.getElementById('ai-odds2').value;
  const comp    = document.getElementById('ai-comp').value;
  const venue   = document.getElementById('ai-venue').value;
  const context = document.getElementById('ai-context').value;

  if(!team1||!team2) { showToast('⚠️ Enter both teams/fighters',false); return; }

  document.getElementById('ai-input-form').style.display='none';
  document.getElementById('ai-result-area').style.display='block';
  document.getElementById('ai-result-area').innerHTML = `
    <div class="ai-loading">
      <div class="ai-spinner"></div>
      <div class="ai-loading-text">ANALYSING MATCH DATA...</div>
    </div>`;

  try {
    const res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': getToken() || '' },
      body: JSON.stringify({
        home: team1, away: team2, sport,
        homeOdds: odds1, awayOdds: odds2,
        comp, venue, context,
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Analysis failed');
    const analysis = data.analysis;
    renderAIResult(analysis, team1, team2, sport, odds1, odds2);
  } catch(err) {
    document.getElementById('ai-result-area').innerHTML = `
      <div style="text-align:center;padding:32px">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div style="color:var(--red);font-family:var(--mono);margin-bottom:8px">Analysis failed</div>
        <div style="color:var(--muted);font-size:12px">${err.message}</div>
        <button class="btn-secondary" style="margin-top:16px" onclick="document.getElementById('ai-input-form').style.display='block';document.getElementById('ai-result-area').style.display='none'">← Try Again</button>
      </div>`;
  }
}

function renderAIResult(a, team1, team2, sport, odds1, odds2) {
  const sc = SPORT_COLOR[sport]||'#10b981';
  document.getElementById('ai-result-area').innerHTML = `
    <div class="ai-result">
      <div class="ai-result-header">
        <div style="flex:1">
          <div style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700">${team1} vs ${team2}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${sport}</div>
        </div>
        ${a.valueBet?`<div class="value-bet-badge" style="padding:4px 10px;font-size:10px">💰 VALUE BET</div>`:''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="ai-confidence-big">
          <div class="ai-conf-num" style="color:${confColor(a.confidence)}">${a.confidence}%</div>
          <div class="ai-conf-label">AI Confidence</div>
          <div class="conf-track" style="margin-top:10px"><div class="conf-fill" style="width:${a.confidence}%;background:${confColor(a.confidence)}"></div></div>
        </div>
        <div class="ai-rec">
          <div class="ai-rec-label">🎯 RECOMMENDATION</div>
          <div class="ai-rec-bet">${a.recommendation}</div>
          <div class="ai-rec-odds">${a.betType} @ ${a.recommendedOdds}</div>
        </div>
      </div>

      <div class="ai-section">
        <div class="ai-section-title">Match Summary</div>
        <div class="ai-section-body">${a.summary}</div>
      </div>

      <div class="ai-section">
        <div class="ai-section-title">Key Factors</div>
        <div class="ai-factors">
          ${(a.keyFactors||[]).map(f=>`
            <div class="ai-factor">
              <div class="ai-factor-icon">${f.icon}</div>
              <div class="ai-factor-label">${f.label}</div>
              <div class="ai-factor-value">${f.value}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="ai-section">
        <div class="ai-section-title">Full Analysis</div>
        <div class="ai-section-body" style="line-height:1.8">${formatAIBold(a.reasoning)}</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-primary" style="flex:1" onclick="closeAIModal();openBetFormPrefill('${team1} vs ${team2}','${a.recommendation}','${sport}','${a.recommendedOdds}',${a.confidence},${a.valueBet})">+ LOG THIS BET</button>
        <button class="btn-secondary" onclick="document.getElementById('ai-input-form').style.display='block';document.getElementById('ai-result-area').style.display='none'">← New Analysis</button>
      </div>

      <div class="ai-disclaimer">${a.disclaimer}</div>
    </div>`;
}

function openBetFormPrefill(event, bet, sport, odds, conf, value) {
  openBetForm();
  setTimeout(()=>{
    document.getElementById('f-event').value = event;
    document.getElementById('f-bet').value   = bet;
    document.getElementById('f-sport').value = sport;
    document.getElementById('f-odds').value  = odds;
    document.getElementById('f-conf').value  = conf;
    document.getElementById('f-value').checked = value;
    document.getElementById('f-ai').checked    = true;
  },50);
}

// ═══════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg, ok=true) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.style.color=ok?'#10b981':'#ef4444';
  el.style.background=ok?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)';
  el.style.borderColor=ok?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)';
  el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

// ═══════════════════════════════════════════════════════════════════
// AUTH SYSTEM — server-side
// ═══════════════════════════════════════════════════════════════════
const TOKEN_KEY = 'edgeiq-token-v2';
let currentUser = null;

function getToken()      { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)     { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()    { localStorage.removeItem(TOKEN_KEY); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'x-session-token': getToken() || '' };
}

// ── Migrate old localStorage bets to server ──
async function migrateOldBets(username) {
  const oldKey  = `edgeiq-bets-${username.toLowerCase()}-v1`;
  const oldBets = JSON.parse(localStorage.getItem(oldKey) || '[]');
  const oldGeneralBets = JSON.parse(localStorage.getItem('edgeiq-bets-v1') || '[]');
  const allOld = [...oldBets, ...oldGeneralBets];
  if (allOld.length === 0) return;
  try {
    // Get current server bets first
    const r = await fetch('/api/bets', { headers: authHeaders() });
    const d = await r.json();
    const serverBets = d.bets || [];
    // Merge — avoid duplicates by id
    const existingIds = new Set(serverBets.map(b => b.id));
    const newBets = allOld.filter(b => !existingIds.has(b.id));
    if (newBets.length > 0) {
      const merged = [...serverBets, ...newBets];
      await fetch('/api/bets', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ bets: merged })
      });
      bets = merged;
      showToast(`✅ Migrated ${newBets.length} existing bets to your account`);
    }
    // Clean up old localStorage keys
    localStorage.removeItem(oldKey);
    localStorage.removeItem('edgeiq-bets-v1');
  } catch(e) { console.error('Migration failed:', e); }
}

function showAuthTab(tab) {
  document.getElementById('auth-signin').style.display = tab==='signin'?'block':'none';
  document.getElementById('auth-signup').style.display = tab==='signup'?'block':'none';
  document.querySelectorAll('.login-tab').forEach((el,i)=>el.classList.toggle('active',(i===0&&tab==='signin')||(i===1&&tab==='signup')));
  document.getElementById('login-error').textContent='';
}

function setLoginError(msg){ document.getElementById('login-error').textContent=msg; }

async function doSignIn() {
  const username = document.getElementById('si-user').value.trim();
  const pin      = document.getElementById('si-pin').value.trim();
  if(!username||!pin){ setLoginError('Enter your username and PIN'); return; }
  setLoginError('Signing in...');
  try {
    const res  = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
    const data = await res.json();
    if (!res.ok) { setLoginError(data.error || 'Sign in failed'); return; }
    setToken(data.token);
    await loginAs(data.profile);
    migrateOldBets(data.profile.username);
  } catch(e) { console.error('signin error:', e); setLoginError('Network error — check connection'); }
}

async function doSignUp() {
  const username = document.getElementById('su-user').value.trim();
  const email    = document.getElementById('su-email').value.trim();
  const sport    = document.getElementById('su-sport').value;
  const pin      = document.getElementById('su-pin').value.trim();
  const pin2     = document.getElementById('su-pin2').value.trim();
  if(!username)             { setLoginError('Choose a username'); return; }
  if(username.length < 2)   { setLoginError('Username must be at least 2 characters'); return; }
  if(!/^\d{4}$/.test(pin))  { setLoginError('PIN must be exactly 4 digits'); return; }
  if(pin !== pin2)          { setLoginError('PINs do not match'); return; }
  setLoginError('Creating account...');
  try {
    const res  = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin, sport, email })
    });
    const data = await res.json();
    if (!res.ok) { setLoginError(data.error || 'Sign up failed'); return; }
    setToken(data.token);
    await loginAs(data.profile);
    migrateOldBets(data.profile.username);
  } catch(e) { console.error('signup error:', e); setLoginError('Network error — check connection'); }
}

function toggleForgotPin() {
  const p = document.getElementById('forgot-panel');
  const isHidden = p.style.display === 'none';
  p.style.display = isHidden ? 'block' : 'none';
  if (isHidden) { document.getElementById('fp-user').focus(); document.getElementById('forgot-result').textContent = ''; }
}

async function doForgotPin() {
  const username = document.getElementById('fp-user').value.trim();
  const email    = document.getElementById('fp-email').value.trim();
  const resEl    = document.getElementById('forgot-result');
  if (!username || !email) { resEl.style.color='#ef4444'; resEl.textContent = 'Enter both username and email.'; return; }
  resEl.style.color = 'var(--muted)';
  resEl.textContent = 'Checking...';
  try {
    const res  = await fetch('/api/auth/reset-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    const data = await res.json();
    if (!res.ok) { resEl.style.color='#ef4444'; resEl.textContent = data.error || 'No match found.'; return; }
    resEl.style.color = '#10b981';
    resEl.innerHTML = `✅ PIN reset! Your new PIN is: <strong style="font-size:18px;color:#10b981;letter-spacing:4px">${data.newPin}</strong><br><span style="color:var(--muted)">Sign in now and change it in your profile.</span>`;
    document.getElementById('si-user').value = username;
    document.getElementById('si-pin').value  = '';
  } catch(e) { resEl.style.color='#ef4444'; resEl.textContent = 'Network error.'; }
}

async function loginAs(profile) {
  currentUser = profile;
  // Load bets from server
  try {
    const r = await fetch('/api/bets', { headers: authHeaders() });
    const d = await r.json();
    bets = d.bets || [];
  } catch(e) { bets = []; }
  // Update header (desktop)
  const av = document.getElementById('user-avatar');
  av.textContent = profile.avatar;
  av.style.background = profile.color+'22';
  av.style.border = `1px solid ${profile.color}44`;
  document.getElementById('user-name').textContent = profile.username.toUpperCase();
  // Update mobile header & sheet
  const mobileAvBtn = document.getElementById('mobile-user-btn');
  if (mobileAvBtn) {
    mobileAvBtn.style.borderColor = profile.color + '44';
    mobileAvBtn.style.background = profile.color + '11';
  }
  const mobileAv = document.getElementById('mobile-user-avatar');
  if (mobileAv) mobileAv.textContent = profile.avatar;
  const sheetAv = document.getElementById('sheet-avatar-el');
  if (sheetAv) { sheetAv.textContent = profile.avatar; sheetAv.style.background = profile.color+'22'; sheetAv.style.borderColor = profile.color+'55'; }
  const sheetUn = document.getElementById('sheet-username-el');
  if (sheetUn) sheetUn.textContent = profile.username.toUpperCase();
  // Show app
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('header').style.display = 'flex';
  document.getElementById('sport-bar').style.display = 'flex';
  document.getElementById('main').style.display = 'block';
  renderHome();
  fetchLiveOdds();
  showDisclaimerIfNeeded();
}

async function doLogout() {
  try { await fetch('/api/auth/signout', { method:'POST', headers: authHeaders() }); } catch{}
  clearToken();
  currentUser = null;
  bets = [];
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('header').style.display = 'none';
  document.getElementById('sport-bar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  document.getElementById('si-user').value = '';
  document.getElementById('si-pin').value  = '';
  setLoginError('');
  showAuthTab('signin');
}

// Override saveBets to save to server
saveBets = async function() {
  try {
    await fetch('/api/bets', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bets })
    });
  } catch(e) { console.error('Failed to save bets:', e); }
};

// Override leaderboard to use server data
showLbSport = async function(sport, btn) {
  currentLbSport = sport;
  if(btn) {
    document.querySelectorAll('#page-leaderboard .filter-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  document.getElementById('lb-content').innerHTML = `<div class="empty">Loading leaderboard...</div>`;
  try {
    const r = await fetch('/api/leaderboard');
    const d = await r.json();
    const allEntries = (d.entries || []).filter(e => e.totalBets > 0).sort((a,b) => b.roi - a.roi);

    // Render aggregate extras (best ROI, most wins, streak)
    renderLbExtras(allEntries);

    const rankEmoji  = ['🥇','🥈','🥉'];
    const rankColors = ['#10b981','#94a3b8','#f97316'];

    document.getElementById('lb-content').innerHTML = allEntries.length < 2
      ? `<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:28px;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">👥</div>
          <div style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px">WAITING FOR YOUR MATES</div>
          <div style="color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:16px">Share this app with your friends. Each person creates their own account and their stats appear here automatically.</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px">${window.location.origin}</div>
        </div>`
      : allEntries.map((e,i)=>{
          const isMe = e.username === currentUser?.username;
          const pos  = e.roi >= 0;
          // Derive streak from recentResults
          let streakBadge = '';
          if (e.recentResults?.length >= 2) {
            const last  = e.recentResults[e.recentResults.length - 1];
            let cnt = 0;
            for (let j = e.recentResults.length - 1; j >= 0 && e.recentResults[j] === last; j--) cnt++;
            if (cnt >= 2) {
              const isWin  = last === 'win';
              const icon   = isWin ? '🔥' : '🥶';
              const color  = isWin ? 'rgba(16,185,129,.12)' : 'rgba(99,102,241,.15)';
              const border = isWin ? 'rgba(16,185,129,.25)' : 'rgba(99,102,241,.3)';
              const textCol = isWin ? '#10b981' : '#818cf8';
              streakBadge = `<span class="streak-badge" style="background:${color};border:1px solid ${border};color:${textCol}">${icon} ${cnt} ${isWin?'W':'L'}</span>`;
            }
          }
          return `<div class="lb-card" ${isMe?'style="border-color:rgba(16,185,129,.25);background:linear-gradient(90deg,rgba(240,180,41,.04),var(--bg3))"':''}>
            <div class="lb-rank" style="color:${i<3?rankColors[i]:'var(--muted)'}">${i<3?rankEmoji[i]:'#'+(i+1)}</div>
            <div class="lb-avatar" style="background:${e.color}18;border:1px solid ${e.color}40">${e.avatar}</div>
            <div class="lb-info">
              <div class="lb-name" style="color:${e.color}">${e.username.toUpperCase()}${isMe?'<span class="lb-you">YOU</span>':''}${streakBadge}</div>
              <div class="lb-meta">${e.totalBets} bets · ${e.wins} wins · ${e.winRate}% WR · ROI ${e.roi}%</div>
            </div>
            <div class="lb-pnl" style="color:${pos?'#10b981':'#ef4444'}">${e.roi >= 0 ? '+' : ''}${e.roi}%</div>
          </div>`;
        }).join('');
  } catch(e) {
    document.getElementById('lb-content').innerHTML = `<div class="empty">Failed to load leaderboard</div>`;
  }
};

// ── Init — check for existing token ──
(async function init() {
  const token = getToken();
  if (token) {
    try {
      const res  = await fetch('/api/auth/me', { headers: { 'x-session-token': token } });
      if (res.ok) {
        const profile = await res.json();
        await loginAs(profile);
        return;
      }
    } catch {}
    clearToken();
  }
  document.getElementById('login-screen').style.display = 'flex';
})();

// Enter key on login
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeBetForm(); closeConfirm(); closeAIModal(); closeMatchModal(); closeQuickBet(); closeBookieSheet(); }
  if(e.key==='Enter' && document.getElementById('login-screen').style.display!=='none'){
    const isSignup = document.getElementById('auth-signup').style.display!=='none';
    if(isSignup) doSignUp(); else doSignIn();
  }
});

// ═══════════════════════════════════════════════════════════════════
// MATCH OF THE DAY
// ═══════════════════════════════════════════════════════════════════
function getMatchOfTheDay() {
  if (!UPCOMING.length) return null;
  const candidates = UPCOMING
    .filter(m => m.aiReady)
    .map(m => {
      const hoursAway = (new Date(m.commenceTime) - Date.now()) / 3600000;
      const soon = hoursAway > 0 && hoursAway < 48;
      let score = m.confidence || 0;
      if (m.valueBet) score += 20;
      if (m.aiReady)  score += 10;
      if (soon)       score += 15;
      return { ...m, score, hoursAway };
    })
    .sort((a, b) => b.score - a.score);
  const best = candidates[0] || UPCOMING[0];
  if (!best) return null;
  // Build "why this is MOTD" reasons
  const reasons = [];
  if ((best.confidence||0) >= 75) reasons.push({ icon:'🎯', text:'High AI Confidence' });
  if (best.valueBet)              reasons.push({ icon:'⚡', text:'Value Odds Detected' });
  if (best.aiReady)               reasons.push({ icon:'🤖', text:'Full AI Analysis Ready' });
  const ha = best.hoursAway ?? ((new Date(best.commenceTime) - Date.now()) / 3600000);
  if (ha > 0 && ha < 6)          reasons.push({ icon:'⏰', text:'Starting Very Soon' });
  else if (ha > 0 && ha < 24)    reasons.push({ icon:'📅', text:'Today\'s Match' });
  if ((best.confidence||0) >= 85) reasons.push({ icon:'🔥', text:'Strong Betting Angle' });
  best.motdReasons = reasons;
  return best;
}

function renderMOTD(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!oddsLoaded) { el.innerHTML = ''; return; }
  const m = getMatchOfTheDay();
  if (!m) { el.innerHTML = ''; return; }
  const sc = SPORT_COLOR[m.sport] || '#aaa';
  const oddsVal = m.pick===m.home ? m.homeOdds : m.pick===m.away ? m.awayOdds : m.drawOdds;
  const ai = m.aiAnalysis;
  el.innerHTML = `
    <div class="motd-card" onclick="openMatchModal('${m.id}')">
      <div class="motd-glow"></div>
      <div class="motd-badge">⭐ MATCH OF THE DAY</div>
      ${m.motdReasons?.length ? `<div class="motd-why-strip">${m.motdReasons.map(r=>`<span class="motd-why-pill">${r.icon} ${r.text}</span>`).join('')}</div>` : ''}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            ${tag(m.sport, sc)}
            <span style="font-size:11px;color:var(--muted);font-family:var(--mono)">${m.time} · ${m.comp}</span>
          </div>
          <div class="motd-teams">${m.isRacing ? `R${m.raceNumber} · ${m.venue}` : `${m.home} <span style="color:var(--muted);font-size:16px">vs</span> ${m.away}`}</div>
          ${m.isRacing ? `<div style="display:flex;align-items:center;gap:10px;margin-top:4px;font-size:12px;color:var(--muted)"><span>📍 ${m.venue}</span><span data-weather-venue="${m.venue}" style="font-weight:600;color:var(--text)">…</span>${m.going?`<span style="background:rgba(255,255,255,.08);border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600">${m.going}</span>`:''}</div>` : ''}
          ${ai?.summary ? `<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-top:6px;max-width:520px">${ai.summary}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:4px">AI CONFIDENCE</div>
          <div class="conf-pulse" style="font-family:var(--mono);font-size:28px;font-weight:700;color:${confColor(m.confidence)}">${m.confidence}%</div>
        </div>
      </div>
      <div class="motd-pick-row">
        <div class="motd-pick">
          <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:4px">🤖 AI PICK</div>
          <div style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;color:#10b981">${m.pick}</div>
          ${oddsVal ? `<div style="font-family:var(--mono);font-size:13px;color:var(--muted);margin-top:2px">@ ${oddsVal}x</div>` : ''}
        </div>
        ${m.valueBet ? `<div class="value-bet-badge">💰 VALUE BET DETECTED</div>` : ''}
        <button onclick="event.stopPropagation();openQuickBet('${m.id}')" style="background:linear-gradient(135deg,#10b981,#059669);color:#000;border:none;border-radius:10px;padding:10px 20px;font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;cursor:pointer">+ BET THIS</button>
      </div>
    </div>`;
  if (m.isRacing) attachWeatherInfo();
}

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARD EXTRAS — streaks, weekly winner, records
// ═══════════════════════════════════════════════════════════════════
function calcStreak(userBets) {
  const settled = [...userBets]
    .filter(b => b.result === 'WIN' || b.result === 'LOSS')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!settled.length) return { count: 0, type: null };
  const type = settled[0].result;
  let count = 0;
  for (const b of settled) {
    if (b.result === type) count++;
    else break;
  }
  return { count, type };
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function renderLbExtras(allEntries) {
  const el = document.getElementById('lb-extras');
  if (!el || !allEntries.length) { if (el) el.innerHTML = ''; return; }

  const qualified = allEntries.filter(e => e.settled >= 3);
  const cards = [];

  // Top ROI
  const topROI = [...qualified].sort((a,b) => b.roi - a.roi)[0];
  if (topROI && topROI.roi > 0) {
    cards.push(`
      <div class="lb-extra-card" style="border-color:rgba(59,130,246,.25)">
        <div class="lb-extra-icon">🎯</div>
        <div class="lb-extra-label">Best ROI</div>
        <div class="lb-extra-name" style="color:${topROI.color}">${topROI.avatar} ${topROI.username.toUpperCase()}</div>
        <div class="lb-extra-sub">+${topROI.roi}% return · ${topROI.settled} bets settled</div>
      </div>`);
  }

  // Highest win rate
  const topWR = [...qualified].sort((a,b) => b.winRate - a.winRate)[0];
  if (topWR && topWR !== topROI) {
    cards.push(`
      <div class="lb-extra-card" style="border-color:rgba(16,185,129,.25);background:linear-gradient(135deg,rgba(16,185,129,.05),var(--bg3))">
        <div class="lb-extra-icon">🏆</div>
        <div class="lb-extra-label">Sharpest Punter</div>
        <div class="lb-extra-name" style="color:${topWR.color}">${topWR.avatar} ${topWR.username.toUpperCase()}</div>
        <div class="lb-extra-sub">${topWR.winRate}% win rate · ${topWR.wins}/${topWR.settled} correct</div>
      </div>`);
  }

  // Most bets placed
  const mostActive = [...allEntries].sort((a,b) => b.totalBets - a.totalBets)[0];
  if (mostActive && mostActive.totalBets >= 5) {
    cards.push(`
      <div class="lb-extra-card" style="border-color:rgba(16,185,129,.25)">
        <div class="lb-extra-icon">⚡</div>
        <div class="lb-extra-label">Most Active</div>
        <div class="lb-extra-name" style="color:${mostActive.color}">${mostActive.avatar} ${mostActive.username.toUpperCase()}</div>
        <div class="lb-extra-sub">${mostActive.totalBets} bets logged</div>
      </div>`);
  }

  el.innerHTML = cards.length
    ? `<div class="lb-extras-grid">${cards.join('')}</div>`
    : '';
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
let quickBetMatch = null;

function openQuickBet(matchId) {
  const m = UPCOMING.find(x=>String(x.id)===String(matchId));
  if (!m) return;
  quickBetMatch = m;

  if (m.isRacing && m.runners && m.runners.length) {
    document.getElementById('qb-match-label').textContent = `R${m.raceNumber} ${m.venue} · ${m.time}`;
    document.getElementById('qb-pick-label').textContent = 'YOUR PICK';
    const sel = document.getElementById('qb-runner-select');
    sel.innerHTML = m.runners.map((r, i) => `<option value="${i}">${r.barrier||i+1}. ${r.name} — $${r.odds < 99 ? r.odds.toFixed(2) : '—'}${i===0?' ★ FAV':''}</option>`).join('');
    sel.value = '0';
    document.getElementById('qb-runner-selector').style.display = 'block';
    updateQuickBetRunner();
  } else {
    document.getElementById('qb-match-label').textContent = `${m.home} vs ${m.away} · ${m.time}`;
    document.getElementById('qb-pick-label').textContent = 'AI PICK';
    document.getElementById('qb-pick').textContent = m.pick;
    const oddsVal = m.pick===m.home ? m.homeOdds : m.pick===m.away ? m.awayOdds : m.drawOdds;
    document.getElementById('qb-odds').textContent = oddsVal ? oddsVal+'x' : '—';
    document.getElementById('qb-runner-selector').style.display = 'none';
    document.getElementById('qb-runner-select').innerHTML = '';
  }

  document.getElementById('qb-stake').value = '';
  document.getElementById('qb-result').value = 'PENDING';
  document.getElementById('quick-bet-modal').style.display = 'flex';
  setTimeout(()=>document.getElementById('qb-stake').focus(), 100);
}

function updateQuickBetRunner() {
  const m = quickBetMatch;
  if (!m || !m.runners) return;
  const idx = parseInt(document.getElementById('qb-runner-select').value) || 0;
  const r = m.runners[idx];
  if (!r) return;
  document.getElementById('qb-pick').textContent = r.name;
  document.getElementById('qb-odds').textContent = r.odds < 99 ? r.odds.toFixed(2)+'x' : '—';
}

function closeQuickBet() {
  document.getElementById('quick-bet-modal').style.display = 'none';
  quickBetMatch = null;
}

function saveQuickBet() {
  const m = quickBetMatch;
  if (!m) return;
  const stake = parseFloat(document.getElementById('qb-stake').value);
  if (isNaN(stake) || stake <= 0) { showToast('⚠️ Enter a valid stake', false); return; }
  const result = document.getElementById('qb-result').value;

  let betPick, oddsVal, eventLabel;
  if (m.isRacing && m.runners) {
    const idx = parseInt(document.getElementById('qb-runner-select').value) || 0;
    const r = m.runners[idx];
    if (!r) { showToast('⚠️ Select a runner', false); return; }
    betPick = r.name;
    oddsVal = r.odds < 99 ? r.odds : 0;
    eventLabel = `R${m.raceNumber} ${m.venue}`;
  } else if (m._marketLabel) {
    betPick = m._marketLabel;
    oddsVal = m._marketOdds;
    eventLabel = `${m.home} vs ${m.away}`;
  } else {
    betPick = m.pick;
    oddsVal = m.pick===m.home ? m.homeOdds : m.pick===m.away ? m.awayOdds : m.drawOdds;
    eventLabel = `${m.home} vs ${m.away}`;
  }

  const entry = {
    id: Date.now(),
    date:     new Date().toLocaleDateString('en-CA'),
    sport:    m.sport,
    event:    eventLabel,
    bet:      betPick,
    stake, odds: oddsVal || 0, result,
    betType:  'WIN', bookmaker: 'Sportsbet',
    venue: m.venue||'', comp: m.comp||'',
    confidence: m.confidence||0,
    valueBet: !!m.valueBet, aiRecommended: !m.isRacing,
    notes: m.isRacing ? 'Logged via Quick Bet (Racing)' : m._marketLabel ? 'Extra market bet' : 'Logged via AI Quick Bet'
  };
  bets.push(entry);
  saveBets();
  closeQuickBet();
  showToast(`✅ Bet logged — ${betPick} @ ${oddsVal}x`);
  renderHome();
}

function openFullBetForm() {
  closeQuickBet();
  if (quickBetMatch) openBetFormWithMatch(quickBetMatch.id);
  else openBetForm();
}

// ═══════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════════
function exportBetsCSV() {
  if (!bets.length) { showToast('⚠️ No bets to export', false); return; }
  const headers = ['Date','Sport','Event','Bet','Stake','Odds','Result','BetType','Bookmaker','Venue','Competition','Confidence%','PnL','ValueBet','AIRecommended','Notes'];
  const rows = bets.map(b => {
    const pnl = calcPnl(b).toFixed(2);
    return [
      b.date, b.sport, `"${(b.event||'').replace(/"/g,'""')}"`, `"${(b.bet||'').replace(/"/g,'""')}"`,
      b.stake, b.odds, b.result, b.betType||'', b.bookmaker||'',
      `"${(b.venue||'').replace(/"/g,'""')}"`, `"${(b.comp||'').replace(/"/g,'""')}"`,
      b.confidence||0, pnl, b.valueBet?'Yes':'No', b.aiRecommended?'Yes':'No',
      `"${(b.notes||'').replace(/"/g,'""')}"`
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `edgeiq-bets-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('✅ Bets exported as CSV');
}

// ═══════════════════════════════════════════════════════════════════
// BOOKIE REDIRECT — "Place at Your Bookie"
// ═══════════════════════════════════════════════════════════════════
const BOOKIES = [
  { name:'Sportsbet', color:'#005bd4', bg:'rgba(0,91,212,.15)', border:'rgba(0,91,212,.5)',
    urls:{ AFL:'https://www.sportsbet.com.au/betting/australian-rules', NRL:'https://www.sportsbet.com.au/betting/rugby-league', NBA:'https://www.sportsbet.com.au/betting/basketball', Soccer:'https://www.sportsbet.com.au/betting/soccer', UFC:'https://www.sportsbet.com.au/betting/ufc', Boxing:'https://www.sportsbet.com.au/betting/boxing', 'Horse Racing':'https://www.sportsbet.com.au/horse-racing', Greyhound:'https://www.sportsbet.com.au/greyhound-racing' } },
  { name:'Ladbrokes', color:'#e50000', bg:'rgba(229,0,0,.12)', border:'rgba(229,0,0,.45)',
    urls:{ AFL:'https://www.ladbrokes.com.au/sport/australian-rules-football', NRL:'https://www.ladbrokes.com.au/sport/rugby-league', NBA:'https://www.ladbrokes.com.au/sport/basketball', Soccer:'https://www.ladbrokes.com.au/sport/soccer', UFC:'https://www.ladbrokes.com.au/sport/ufc', Boxing:'https://www.ladbrokes.com.au/sport/boxing', 'Horse Racing':'https://www.ladbrokes.com.au/racing/horse-racing', Greyhound:'https://www.ladbrokes.com.au/racing/greyhound-racing' } },
  { name:'TAB', color:'#00a650', bg:'rgba(0,166,80,.12)', border:'rgba(0,166,80,.45)',
    urls:{ AFL:'https://www.tab.com.au/sports/betting/australian-rules', NRL:'https://www.tab.com.au/sports/betting/rugby-league', NBA:'https://www.tab.com.au/sports/betting/basketball', Soccer:'https://www.tab.com.au/sports/betting/soccer', UFC:'https://www.tab.com.au/sports/betting/mma', Boxing:'https://www.tab.com.au/sports/betting/boxing', 'Horse Racing':'https://www.tab.com.au/racing', Greyhound:'https://www.tab.com.au/racing' } },
  { name:'Neds', color:'#ff6600', bg:'rgba(255,102,0,.12)', border:'rgba(255,102,0,.45)',
    urls:{ AFL:'https://www.neds.com.au/sports/australian-rules', NRL:'https://www.neds.com.au/sports/rugby-league', NBA:'https://www.neds.com.au/sports/basketball', Soccer:'https://www.neds.com.au/sports/soccer', UFC:'https://www.neds.com.au/sports/ufc', Boxing:'https://www.neds.com.au/sports/boxing', 'Horse Racing':'https://www.neds.com.au/racing/horse-racing', Greyhound:'https://www.neds.com.au/racing/greyhound-racing' } },
  { name:'Pointsbet', color:'#d0021b', bg:'rgba(208,2,27,.12)', border:'rgba(208,2,27,.45)',
    urls:{ AFL:'https://pointsbet.com.au/sports/australian-rules-football', NRL:'https://pointsbet.com.au/sports/rugby-league', NBA:'https://pointsbet.com.au/sports/basketball/nba', Soccer:'https://pointsbet.com.au/sports/soccer', UFC:'https://pointsbet.com.au/sports/ufc', Boxing:'https://pointsbet.com.au/sports/boxing', 'Horse Racing':'https://pointsbet.com.au/racing', Greyhound:'https://pointsbet.com.au/racing' } },
  { name:'Unibet', color:'#147b45', bg:'rgba(20,123,69,.12)', border:'rgba(20,123,69,.45)',
    urls:{ AFL:'https://www.unibet.com.au/betting/sports/australian-rules-football', NRL:'https://www.unibet.com.au/betting/sports/rugby-league', NBA:'https://www.unibet.com.au/betting/sports/basketball', Soccer:'https://www.unibet.com.au/betting/sports/soccer', UFC:'https://www.unibet.com.au/betting/sports/mma', Boxing:'https://www.unibet.com.au/betting/sports/boxing', 'Horse Racing':'https://www.unibet.com.au/betting/racing', Greyhound:'https://www.unibet.com.au/betting/racing' } },
  { name:'Betfair', color:'#f5a623', bg:'rgba(245,166,35,.1)', border:'rgba(245,166,35,.4)',
    urls:{ AFL:'https://www.betfair.com.au/exchange/plus/australian-rules-betting', NRL:'https://www.betfair.com.au/exchange/plus/rugby-league-betting', NBA:'https://www.betfair.com.au/exchange/plus/basketball-betting', Soccer:'https://www.betfair.com.au/exchange/plus/soccer-betting', UFC:'https://www.betfair.com.au/exchange/plus/ufc-betting', Boxing:'https://www.betfair.com.au/exchange/plus/boxing-betting', 'Horse Racing':'https://www.betfair.com.au/exchange/plus/horse-racing-betting', Greyhound:'https://www.betfair.com.au/exchange/plus/greyhound-racing-betting' } },
  { name:'Betright', color:'#7c3aed', bg:'rgba(124,58,237,.12)', border:'rgba(124,58,237,.45)',
    urls:{ AFL:'https://betright.com.au/sports/australian-rules', NRL:'https://betright.com.au/sports/rugby-league', NBA:'https://betright.com.au/sports/basketball', Soccer:'https://betright.com.au/sports/soccer', UFC:'https://betright.com.au/sports/mma', Boxing:'https://betright.com.au/sports/boxing', 'Horse Racing':'https://betright.com.au/racing/horse', Greyhound:'https://betright.com.au/racing/greyhound' } },
  { name:'BlueBet', color:'#1e6abf', bg:'rgba(30,106,191,.12)', border:'rgba(30,106,191,.45)',
    urls:{ AFL:'https://www.bluebet.com.au/sports/australian-rules', NRL:'https://www.bluebet.com.au/sports/rugby-league', NBA:'https://www.bluebet.com.au/sports/basketball', Soccer:'https://www.bluebet.com.au/sports/soccer', UFC:'https://www.bluebet.com.au/sports/mma', Boxing:'https://www.bluebet.com.au/sports/boxing', 'Horse Racing':'https://www.bluebet.com.au/racing', Greyhound:'https://www.bluebet.com.au/racing' } },
];

const BOOKIE_PREF_KEY = 'edgeiq-preferred-bookie';
let _bookieMatchId = null;
let _bookiePick    = '';
let _bookieOdds    = '';
let _bookieSport   = '';
let _bookieStake   = '';

function openBookieSheet(matchId, pick, odds, sport, stake) {
  _bookieMatchId = matchId;
  _bookiePick    = pick || '';
  _bookieOdds    = odds || '';
  _bookieSport   = sport || '';
  _bookieStake   = stake || '';

  const m = UPCOMING.find(x => String(x.id) === String(matchId));
  const eventLabel = m ? (m.isRacing ? `R${m.raceNumber} · ${m.venue} · ${m.time}` : `${m.home} vs ${m.away} · ${m.time}`) : '';

  document.getElementById('bk-event').textContent = eventLabel;
  document.getElementById('bk-pick').textContent  = pick || '—';
  document.getElementById('bk-odds').textContent  = odds ? odds + 'x' : '—';
  document.getElementById('bk-stake').textContent = stake ? '$' + parseFloat(stake).toFixed(2) : '—';
  document.getElementById('bk-sport-name').textContent = sport || 'sports';

  // Build bookie grid
  const grid = document.getElementById('bk-grid');
  grid.innerHTML = BOOKIES.map(b => `
    <button onclick="sendToBookie('${b.name}')"
      style="background:${b.bg};border:1px solid ${b.border};color:${b.color};border-radius:12px;padding:14px 8px;font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .15s;width:100%"
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px ${b.bg}'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      ${b.name}
    </button>`).join('');

  // Preferred bookie shortcut
  const pref = localStorage.getItem(BOOKIE_PREF_KEY);
  const prefBookie = pref && BOOKIES.find(b => b.name === pref);
  const prefWrap = document.getElementById('bk-preferred-wrap');
  const prefBtn  = document.getElementById('bk-preferred-btn');
  if (prefBookie) {
    prefWrap.style.display = 'block';
    prefBtn.textContent = `⚡ Quick-send to ${prefBookie.name}`;
    prefBtn.style.background = prefBookie.bg;
    prefBtn.style.border = `1px solid ${prefBookie.border}`;
    prefBtn.style.color = prefBookie.color;
  } else {
    prefWrap.style.display = 'none';
  }

  document.getElementById('bookie-overlay').style.display = 'block';
  document.getElementById('bookie-sheet').style.display   = 'block';
  document.body.style.overflow = 'hidden';
}

function closeBookieSheet() {
  document.getElementById('bookie-overlay').style.display = 'none';
  document.getElementById('bookie-sheet').style.display   = 'none';
  document.body.style.overflow = '';
}

function sendToBookie(bookieName) {
  const bookie = BOOKIES.find(b => b.name === bookieName);
  if (!bookie) return;

  // Save as preferred
  localStorage.setItem(BOOKIE_PREF_KEY, bookieName);

  // Build clipboard text
  const clipText = [
    `${_bookiePick}`,
    _bookieOdds ? `Odds: ${_bookieOdds}x` : '',
    _bookieStake ? `Stake: $${parseFloat(_bookieStake).toFixed(2)}` : '',
    _bookieSport ? `Sport: ${_bookieSport}` : '',
    '— via edgebets.net'
  ].filter(Boolean).join('\n');

  // Copy to clipboard
  navigator.clipboard.writeText(clipText).catch(() => {});

  // Open bookie URL
  const url = bookie.urls[_bookieSport] || bookie.urls['AFL'] || 'https://www.sportsbet.com.au';
  window.open(url, '_blank', 'noopener');

  showToast(`🏦 Opening ${bookieName} — bet details copied to clipboard!`);
  closeBookieSheet();
}

function goPreferredBookie() {
  const pref = localStorage.getItem(BOOKIE_PREF_KEY);
  if (pref) sendToBookie(pref);
}

// Open bookie sheet from Quick Bet modal (reads current QB state)
function openBookieSheetFromQB() {
  const m = quickBetMatch;
  if (!m) return;
  let pick, odds;
  if (m.isRacing && m.runners) {
    const idx = parseInt(document.getElementById('qb-runner-select').value) || 0;
    const r = m.runners[idx];
    pick = r ? r.name : m.pick;
    odds = r && r.odds < 99 ? r.odds.toFixed(2) : '';
  } else if (m._marketLabel) {
    pick = m._marketLabel;
    odds = m._marketOdds ? m._marketOdds.toFixed(2) : '';
  } else {
    pick = m.pick;
    const oddsVal = m.pick===m.home ? m.homeOdds : m.pick===m.away ? m.awayOdds : m.drawOdds;
    odds = oddsVal ? oddsVal.toFixed(2) : '';
  }
  const stake = document.getElementById('qb-stake').value;
  openBookieSheet(m.id, pick, odds, m.sport, stake);
}

// ═══════════════════════════════════════════════════════════════════
// BET SLIP
// ═══════════════════════════════════════════════════════════════════
(function initSlip() {
  try { betSlip = JSON.parse(localStorage.getItem('edgeiq-slip') || '[]'); } catch { betSlip = []; }
  setTimeout(updateSlipFab, 200);
})();

function saveSlip() { try { localStorage.setItem('edgeiq-slip', JSON.stringify(betSlip)); } catch {} }

function updateSlipFab() {
  const fab = document.getElementById('slip-fab');
  const cnt = document.getElementById('slip-count');
  if (!fab) return;
  if (betSlip.length > 0) { fab.classList.add('has-legs'); cnt.textContent = betSlip.length; }
  else { fab.classList.remove('has-legs'); }
}

function isInSlip(matchId, market, outcome) {
  return betSlip.some(l => String(l.matchId) === String(matchId) && l.market === market && l.outcome === outcome);
}

function addToSlip(matchId, match, sport, market, outcome, odds, btnEl) {
  const idx = betSlip.findIndex(l => String(l.matchId) === String(matchId) && l.market === market && l.outcome === outcome);
  if (idx !== -1) {
    betSlip.splice(idx, 1);
    saveSlip(); updateSlipFab();
    if (btnEl) { btnEl.textContent = '+'; btnEl.classList.remove('added'); }
    showToast('Removed from slip', false);
  } else {
    betSlip.push({ matchId: String(matchId), match, sport, market, outcome, odds });
    saveSlip(); updateSlipFab();
    if (btnEl) { btnEl.textContent = '✓'; btnEl.classList.add('added'); }
    showToast(`✓ ${betSlip.length} leg${betSlip.length > 1 ? 's' : ''} in slip`, true);
  }
}

function removeFromSlip(idx) {
  betSlip.splice(idx, 1);
  saveSlip(); updateSlipFab();
  renderBetSlip();
}

function clearBetSlip() {
  betSlip = [];
  saveSlip(); updateSlipFab();
  closeBetSlip();
}

function openBetSlip() {
  renderBetSlip();
  document.getElementById('slip-overlay').style.display = 'block';
  document.getElementById('slip-sheet').style.display = 'block';
}

function closeBetSlip() {
  document.getElementById('slip-overlay').style.display = 'none';
  document.getElementById('slip-sheet').style.display = 'none';
}

function updateSlipReturn() {
  const stake = parseFloat(document.getElementById('slip-stake')?.value || '');
  const retRow = document.getElementById('slip-ret-row');
  const retVal = document.getElementById('slip-ret-val');
  if (!retRow || !retVal) return;
  if (!isNaN(stake) && stake > 0) {
    const combined = betSlip.reduce((p, l) => p * l.odds, 1);
    retRow.style.display = 'flex';
    retVal.textContent = '$' + (stake * combined).toFixed(2);
  } else { retRow.style.display = 'none'; }
}

function logMultiBet() {
  const stake = parseFloat(document.getElementById('slip-stake')?.value || '');
  if (isNaN(stake) || stake <= 0) { showToast('⚠️ Enter a valid stake', false); return; }
  const combined = parseFloat(betSlip.reduce((p, l) => p * l.odds, 1).toFixed(2));
  const legsDetail = betSlip.map(l => `${l.outcome} (${l.match}) @ ${l.odds}x`).join(' | ');
  const b = {
    id: Date.now(),
    event: `${betSlip.length}-Leg Multi`,
    bet: betSlip.map(l => l.outcome).join(' / '),
    sport: betSlip[0]?.sport || 'Other',
    stake, odds: combined,
    result: 'PENDING',
    betType: 'MULTI',
    date: new Date().toISOString().split('T')[0],
    notes: legsDetail,
    bookmaker: '', confidence: '', position: '',
    match: `${betSlip.length}-Leg Multi`,
    label: betSlip.map(l => l.outcome).join(' / '),
  };
  bets.push(b);
  saveBets();
  renderMyBets();
  showToast(`✓ ${betSlip.length}-leg multi logged!`, true);
  clearBetSlip();
}

function renderBetSlip() {
  const body = document.getElementById('slip-body');
  if (!body) return;
  if (betSlip.length === 0) {
    body.innerHTML = `<div style="text-align:center;padding:44px 20px;color:var(--muted)">
      <div style="font-size:42px;margin-bottom:12px">🎫</div>
      <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">Slip is empty</div>
      <div style="font-size:12px">Tap the <strong style="color:var(--accent)">+</strong> on any outcome to add a leg</div>
    </div>`;
    return;
  }
  const combined = betSlip.reduce((p, l) => p * l.odds, 1);
  body.innerHTML = `
    <div>${betSlip.map((l, i) => `
      <div class="slip-leg">
        <div class="slip-leg-info">
          <div class="slip-leg-mkt">${l.sport} · ${l.market}</div>
          <div class="slip-leg-sel">${l.outcome}</div>
          <div class="slip-leg-match">${l.match}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div class="slip-leg-odds">${l.odds}x</div>
          <button class="slip-rm" onclick="removeFromSlip(${i})" title="Remove leg">×</button>
        </div>
      </div>`).join('')}
    </div>
    <div style="background:var(--bg3);border-radius:12px;padding:14px 16px;margin:14px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;color:var(--muted);letter-spacing:1px">COMBINED ODDS</span>
        <span style="font-family:var(--mono);font-size:24px;font-weight:700;color:#10b981">${combined.toFixed(2)}x</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--muted);letter-spacing:1px">${betSlip.length} LEG${betSlip.length > 1 ? 'S' : ''}</span>
        <span style="font-size:11px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${betSlip.map(l => l.outcome).join(', ')}</span>
      </div>
    </div>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;color:var(--muted);letter-spacing:1px;display:block;margin-bottom:6px">STAKE ($)</label>
      <input type="number" id="slip-stake" data-testid="input-slip-stake" placeholder="50.00" step="5" inputmode="decimal"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:13px 16px;color:var(--text);font-family:var(--mono);font-size:16px;box-sizing:border-box;outline:none"
        oninput="updateSlipReturn()">
    </div>
    <div id="slip-ret-row" style="display:none;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:8px;padding:11px 14px;margin-bottom:14px;align-items:center;justify-content:space-between">
      <span style="font-size:11px;color:var(--muted);letter-spacing:1px">POTENTIAL RETURN</span>
      <span id="slip-ret-val" style="font-family:var(--mono);font-size:18px;font-weight:700;color:#10b981"></span>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-primary" style="flex:1" data-testid="button-log-multi" onclick="logMultiBet()">💾 LOG MULTI BET</button>
      <button onclick="clearBetSlip()" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#ef4444;border-radius:10px;padding:12px 16px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:.5px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent">CLEAR</button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// CUMULATIVE P&L CHART
// ═══════════════════════════════════════════════════════════════════
function drawPnlChart(betList) {
  const wrap = document.getElementById('pnl-chart-wrap');
  const canvas = document.getElementById('pnl-chart');
  if (!canvas || !betList.length) { if(wrap) wrap.style.display='none'; return; }
  const settled = [...betList].sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(b=>b.result!=='PENDING');
  if (settled.length < 2) { wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600; const H = 60;
  canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  let cum = 0;
  const points = settled.map(b => { cum += calcPnl(b); return cum; });
  const min = Math.min(0, ...points), max = Math.max(0, ...points);
  const range = max - min || 1;
  const toY = v => H - 4 - ((v - min) / range) * (H - 8);
  const toX = i => (i / (points.length - 1)) * W;
  const zero = toY(0);
  ctx.clearRect(0,0,W,H);
  // Fill under/over zero
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0]));
  for (let i=1;i<points.length;i++) ctx.lineTo(toX(i), toY(points[i]));
  ctx.lineTo(toX(points.length-1), zero);
  ctx.lineTo(toX(0), zero);
  ctx.closePath();
  const finalProfit = points[points.length-1];
  const grad = ctx.createLinearGradient(0,0,0,H);
  if (finalProfit >= 0) {
    grad.addColorStop(0,'rgba(16,185,129,.3)'); grad.addColorStop(1,'rgba(16,185,129,.02)');
  } else {
    grad.addColorStop(0,'rgba(239,68,68,.02)'); grad.addColorStop(1,'rgba(239,68,68,.3)');
  }
  ctx.fillStyle = grad; ctx.fill();
  // Zero line
  ctx.beginPath(); ctx.moveTo(0,zero); ctx.lineTo(W,zero);
  ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0]));
  for (let i=1;i<points.length;i++) ctx.lineTo(toX(i), toY(points[i]));
  ctx.strokeStyle = finalProfit>=0 ? '#10b981' : '#ef4444';
  ctx.lineWidth=2; ctx.stroke();
  // End dot
  ctx.beginPath(); ctx.arc(toX(points.length-1), toY(finalProfit), 4, 0, Math.PI*2);
  ctx.fillStyle = finalProfit>=0?'#10b981':'#ef4444'; ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH IN MY BETS
// ═══════════════════════════════════════════════════════════════════
let betSearchQuery = '';
function onBetsSearch() {
  betSearchQuery = (document.getElementById('bets-search')?.value || '').toLowerCase();
  filterBets(currentBetFilter, null);
}

// ═══════════════════════════════════════════════════════════════════
// QUICK RESULT UPDATE
// ═══════════════════════════════════════════════════════════════════
function quickUpdateResult(betId, result) {
  const idx = bets.findIndex(b=>b.id===betId);
  if (idx === -1) return;
  bets[idx] = { ...bets[idx], result };
  saveBets();
  renderMyBets();
  renderHome();
  showToast(`✅ Marked as ${result}`);
}

// ═══════════════════════════════════════════════════════════════════
// PENDING BETS PANEL (Home page)
// ═══════════════════════════════════════════════════════════════════
function renderHomePending() {
  const wrap = document.getElementById('home-pending-bets-wrap');
  const el = document.getElementById('home-pending-bets');
  if (!wrap || !el) return;
  const pending = bets.filter(b => b.result === 'PENDING').slice(-5).reverse();
  if (!pending.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  el.innerHTML = pending.map(b => {
    const sc = SPORT_COLOR[b.sport] || '#aaa';
    const oddsVal = parseFloat(b.odds);
    const potentialReturn = b.stake * oddsVal;
    return `<div style="background:var(--bg2);border:1px solid rgba(245,158,11,.2);border-left:3px solid #f59e0b;border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:160px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">${sportTag(b.sport)}<span style="font-size:11px;color:var(--muted)">${b.date}</span></div>
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">${b.event}</div>
        <div style="font-size:12px;color:var(--muted)">${b.bet} · <span style="color:#f59e0b;font-family:var(--mono)">${b.odds}x</span> · <span style="color:var(--text2)">$${b.stake} stake</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Potential return: <span style="color:#10b981;font-family:var(--mono);font-weight:700">$${potentialReturn.toFixed(2)}</span></div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button onclick="quickUpdateResult(${b.id},'WIN')" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--mono)">✓ WIN</button>
        <button onclick="quickUpdateResult(${b.id},'PLACE')" style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#3b82f6;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--mono)">P</button>
        <button onclick="quickUpdateResult(${b.id},'LOSS')" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#ef4444;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--mono)">✗ LOSS</button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// SHARE AI PICK
// ═══════════════════════════════════════════════════════════════════
function shareAIPick(matchId) {
  try {
    if (!matchId) { showToast('⚠️ No match selected', false); return; }
    const m = UPCOMING.find(x => String(x.id) === String(matchId));
    if (!m) { showToast('⚠️ Match data not found — odds may have refreshed', false); return; }

    // Safely resolve odds — pick may not align with home/away (e.g. racing, draw picks)
    const oddsVal = (() => {
      if (m.pick === m.home && m.homeOdds) return m.homeOdds;
      if (m.pick === m.away && m.awayOdds) return m.awayOdds;
      if (m.drawOdds) return m.drawOdds;
      return null;
    })();

    const ai = m.aiAnalysis || {};
    const isRacing = m.sport === 'Greyhound' || m.sport === 'Horse Racing';
    const matchLine = isRacing
      ? `R${m.raceNumber || '?'} ${m.venue || 'TBC'}${m.distance ? ` · ${m.distance}m` : ''}`
      : `${m.home || '?'} vs ${m.away || '?'}`;

    const lines = [
      '🤖 THE EDGE AI PICK',
      '',
      `${m.sport || 'Sport'} · ${m.time || 'TBC'}`,
      matchLine,
      '',
      `✅ PICK: ${m.pick || '—'}${oddsVal ? ` @ ${oddsVal}x` : ''}`,
      typeof m.confidence === 'number' ? `📊 CONFIDENCE: ${m.confidence}%` : '',
      m.valueBet ? '⚡ VALUE BET DETECTED' : '',
      ai.summary ? `\n${ai.summary}` : '',
      '',
      'edgebets.net'
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      navigator.share({ title: 'The Edge AI Pick', text: lines }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines)
        .then(() => showToast('📋 Copied to clipboard!'))
        .catch(() => showToast('⚠️ Could not copy — try long-pressing to select', false));
    } else {
      // Fallback for older browsers without clipboard API
      showToast('⚠️ Sharing not supported on this browser', false);
    }
  } catch (err) {
    console.error('[shareAIPick] Error:', err);
    showToast('⚠️ Something went wrong sharing', false);
  }
}

// ═══════════════════════════════════════════════════════════════════
// DISCLAIMER
// ═══════════════════════════════════════════════════════════════════
const DISCLAIMER_KEY = 'edgeiq-disclaimer-v1';

function showDisclaimerIfNeeded() {
  if (!localStorage.getItem(DISCLAIMER_KEY)) {
    document.getElementById('disclaimer-modal').style.display = 'flex';
  }
}
