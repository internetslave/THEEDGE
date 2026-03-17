// THE EDGE — DATA LAYER

function loadBets() { try { return JSON.parse(localStorage.getItem(BETS_KEY)||'[]'); } catch{return[];} }
function saveBets() { localStorage.setItem(BETS_KEY, JSON.stringify(bets)); }
function loadSavedInsights() { try { return JSON.parse(localStorage.getItem(SAVED_INSIGHTS_KEY)||'[]'); } catch{return[];} }
function persistSavedInsights() { localStorage.setItem(SAVED_INSIGHTS_KEY, JSON.stringify(savedInsights)); }
function loadOnboardingDismissed() { try { return JSON.parse(localStorage.getItem(ONBOARDING_KEY)||'false'); } catch{return false;} }
function persistOnboardingDismissed() { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingDismissed)); }
bets = loadBets();
savedInsights = loadSavedInsights();
onboardingDismissed = loadOnboardingDismissed();

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
  spans.forEach(s => {
    const w = weatherCache[s.dataset.weatherVenue];
    s.textContent = w ? `${wmoEmoji(w.code)} ${w.temp}°C` : '';
  });
}

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
      dataMeta: buildMarketTrustMeta(ev.dataMeta || {}),
      analysisMeta: ev.analysisMeta || null,
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
    dataMeta: buildMarketTrustMeta(ev.dataMeta || {}),
    analysisMeta: buildAnalysisTrustMeta(ev.analysisMeta || ev._meta || {}, confidence),
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


// ── IDLE DETECTION ──
function isUserIdle() {
  return (Date.now() - _lastActivity) > 15 * 60 * 1000;
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
      oddsAsOf = data.asOf || oddsLastUpdated;
      oddsGeneratedAt = data.generatedAt || Date.now();
      oddsFreshnessStatus = data.freshnessStatus || 'fresh';
      oddsFreshnessText = data.freshnessLabel || 'Fresh market snapshot';
      oddsWarnings = Array.isArray(data.warnings) ? data.warnings : [];
      oddsSources = Array.isArray(data.sources) ? data.sources : [];
      if (data.nextRefresh)        oddsNextRefresh = data.nextRefresh;
      if (data.creditsRemaining != null) {
        oddsCreditsRemaining = data.creditsRemaining;
        updateCreditsBadge();
      }
      updateLastUpdatedBadge();
      if (forceRefresh && oddsWarnings.length) {
        showToast(`⚠️ ${oddsWarnings[0].message}`, false);
      }
      scheduleNextOddsPoll();
      const activePage = document.querySelector('.page.active')?.id?.replace('page-','');
      if (activePage) showPage(activePage);
    } else {
      if (!oddsLoaded) showToast('⚠️ Odds data is unavailable right now. Saved bets and history are still available.', false);
      scheduleNextOddsPoll();
    }
  } catch(err) {
    showToast('⚠️ Odds unavailable right now. Your tracked bets are still available.', false);
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
  const wrap = document.querySelector('.live-badge');
  const el = document.getElementById('live-badge-text');
  if (!el) return;
  if (wrap) wrap.classList.remove('is-cached', 'is-stale');
  if (!oddsLastUpdated) { el.textContent = 'MARKET DATA'; return; }
  const mins = Math.floor((Date.now() - oddsLastUpdated) / 60000);
  const ageText = mins < 1 ? 'just refreshed' : mins < 60 ? `${mins}m old` : `${Math.floor(mins/60)}h old`;
  if (oddsFreshnessStatus === 'stale') {
    if (wrap) wrap.classList.add('is-stale');
    el.textContent = `STALE DATA · ${ageText.toUpperCase()}`;
    return;
  }
  if (oddsFreshnessStatus === 'cached') {
    if (wrap) wrap.classList.add('is-cached');
    el.textContent = `CACHED DATA · ${ageText.toUpperCase()}`;
    return;
  }
  el.textContent = `VERIFIED DATA · ${ageText.toUpperCase()}`;
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
