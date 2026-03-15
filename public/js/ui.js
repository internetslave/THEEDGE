// THE EDGE — UI INTERACTIONS

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

function confirmDelete(id) {
  deleteId = id;
  const b = bets.find(x=>x.id===id);
  document.getElementById('confirm-title').textContent = `Delete bet on "${b?.event}"?`;
  document.getElementById('confirm-ok').onclick = doDelete;
  document.getElementById('confirm-modal').classList.add('show');
}
function doDelete() { bets=bets.filter(b=>b.id!==deleteId); saveBets(); closeConfirm(); renderMyBets(); showToast('🗑️ Deleted',false); }
function closeConfirm() { document.getElementById('confirm-modal').classList.remove('show'); deleteId=null; }


function closeMatchModal() { document.getElementById('match-modal').classList.remove('show'); }

 { document.getElementById('match-modal').classList.remove('show'); }

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

// ═══════════════════════════════════════════════════════════════════
function showToast(msg, ok=true) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.style.color=ok?'#10b981':'#ef4444';
  el.style.background=ok?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)';
  el.style.borderColor=ok?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)';
  el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

// ═══════════════════════════════════════════════════════════════════

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

function onBetsSearch() {
  betSearchQuery = (document.getElementById('bets-search')?.value || '').toLowerCase();
  filterBets(currentBetFilter, null);
}

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

