// THE EDGE — RENDERERS

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
