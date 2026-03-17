// THE EDGE — EXTRA MARKETS
// ⚠️ INDICATIVE ODDS: These markets are algorithmically generated
// from head-to-head prices. They are NOT live bookmaker data.


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
      <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">📊 EXTRA MARKETS <span class="indicative-badge">⚠️ INDICATIVE</span></div>
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
  const dataTrust = buildMarketTrustMeta(m.dataMeta || {});
  const analysisTrust = buildAnalysisTrustMeta(m.analysisMeta || {}, m.confidence);
  const ai = m.aiReady ? {
    summary: m.summary || m.reasoning || '',
    form: m.form || null,
    headToHead: m.headToHead || '',
    venueEdge: m.venueEdge || '',
    keyFactors: m.keyFactors?.length ? m.keyFactors : (m.keyFactor ? [{icon:'🔑', label:'Key Factor', value: m.keyFactor}] : []),
    bettingAngle: m.bettingAngle || '',
    disclaimer: m.disclaimer || '',
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
    const liveTag = dataTrust.sourceType === 'projected_data'
      ? '<span style="background:rgba(246,173,85,.12);color:#ffd29f;border:1px solid rgba(246,173,85,.3);border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:1px;margin-left:8px">PROJECTED FIELD</span>'
      : '<span style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.3);border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:1px;margin-left:8px">VERIFIED FEED</span>';
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
        ${m.pick===m.home?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ MODEL LEAN</div>`:''}
        ${m.homeOdds?`<button class="slip-add-btn${isInSlip(String(m.id),'H2H',m.home)?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','${m.home.replace(/'/g,"\\'")}',${m.homeOdds},this)">${isInSlip(String(m.id),'H2H',m.home)?'✓ IN SLIP':'+ ADD TO SLIP'}</button>`:''}
      </div>
      ${m.drawOdds?`
      <div style="flex:1;background:var(--bg);border:1px solid ${m.pick==='Draw'?'rgba(240,180,41,.4)':'var(--border)'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">DRAW</div>
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">Draw</div>
        <div style="font-size:22px;font-weight:700;color:${m.pick==='Draw'?'#00ffa3':'var(--text)'}">${m.drawOdds}</div>
        ${m.pick==='Draw'?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ MODEL LEAN</div>`:''}
        <button class="slip-add-btn${isInSlip(String(m.id),'H2H','Draw')?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','Draw',${m.drawOdds},this)">${isInSlip(String(m.id),'H2H','Draw')?'✓ IN SLIP':'+ ADD TO SLIP'}</button>
      </div>`:''}
      <div style="flex:1;background:var(--bg);border:1px solid ${m.pick===m.away?'rgba(240,180,41,.4)':'var(--border)'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">AWAY</div>
        <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text)">${m.away}</div>
        <div style="font-size:22px;font-weight:700;color:${m.pick===m.away?'#00ffa3':'var(--text)'}">${m.awayOdds||'—'}</div>
        ${m.pick===m.away?`<div style="font-size:10px;color:#10b981;margin-top:4px;letter-spacing:1px">✓ MODEL LEAN</div>`:''}
        ${m.awayOdds?`<button class="slip-add-btn${isInSlip(String(m.id),'H2H',m.away)?' added':''}" onclick="addToSlip('${m.id}','${_safeMatch}','${m.sport}','H2H','${m.away.replace(/'/g,"\\'")}',${m.awayOdds},this)">${isInSlip(String(m.id),'H2H',m.away)?'✓ IN SLIP':'+ ADD TO SLIP'}</button>`:''}
      </div>
    </div>`;
  }

  const aiSection = m.isRacing ? '' : ai ? `
    <div style="background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.15);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:18px">🤖</span>
        <span style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;color:#10b981">MODEL INTERPRETATION</span>
        <span style="margin-left:auto;font-family:var(--mono);font-size:12px;color:${confCol};font-weight:700">${m.confidence}% CONF</span>
      </div>
      ${ai.summary ? `<div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(16,185,129,.12)">${ai.summary}</div>` : ''}
      ${renderTrustPattern(analysisTrust, { title: 'Generated insight', compact: true })}
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
        <div style="font-size:10px;color:#10b981;letter-spacing:1.5px;font-weight:700;margin-bottom:4px">💡 MARKET VIEW</div>
        <div style="font-size:12px;color:var(--text);line-height:1.7">${formatAIBold(ai.bettingAngle)}</div>
      </div>` : ''}
      ${ai.disclaimer ? `<div class="trust-note">${ai.disclaimer}</div>` : ''}
    </div>` : `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;text-align:center">
      <div style="font-size:22px;margin-bottom:8px">🤖</div>
      <div id="md-ai-loading" style="font-size:11px;color:var(--muted);letter-spacing:1px">Building a model view from the current inputs...</div>
      <div class="signal-source" style="justify-content:center;margin-top:12px">
        <span class="signal-chip">User-selected market</span>
        <span class="signal-chip">Generated insight pending</span>
      </div>
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

  const valueBadge = m.valueBet ? `<div class="value-bet-badge" style="margin-bottom:16px">💰 Potential value edge</div>` : '';
  const trustStrip = `
    ${renderTrustPattern(dataTrust, { title: dataTrust.sourceType === 'projected_data' ? 'Projected race data' : 'Verified market data', compact: true })}
    <div class="signal-source" style="margin:14px 0">
      <span class="signal-chip">${m.aiReady ? 'Generated insight loaded' : 'Generated insight pending'}</span>
      <span class="signal-chip">Log bets separately</span>
      <span class="signal-chip">User tracking stays separate</span>
    </div>
    ${dataTrust.warning ? `<div class="suite-inline-note">${dataTrust.warning}</div>` : ''}`;

  const extraMarketsHtml = m.isRacing ? '' : renderExtraMarkets(m);

  document.getElementById('md-body').innerHTML = `
    ${oddsRow}
    ${extraMarketsHtml}
    ${valueBadge}
    ${trustStrip}
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
      <div class="signal-source" style="justify-content:center">
        <span class="signal-chip">User-provided scenario</span>
        <span class="signal-chip">Generated insight incoming</span>
        <span class="signal-chip">No certainty implied</span>
      </div>
    </div>`;

  try {
    const eventId = `manual_${sport}_${team1}_${team2}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': getToken() || '' },
      body: JSON.stringify({
        event: {
          id: eventId,
          home: team1,
          away: team2,
          sport,
          homeOdds: odds1,
          awayOdds: odds2,
          comp,
          venue,
          context,
        },
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Analysis failed');
    const analysis = data.analysis;
    renderAIResult(analysis, team1, team2, sport, odds1, odds2);
  } catch(err) {
    document.getElementById('ai-result-area').innerHTML = `
      ${renderStateEmpty(
        '⚠️',
        'Analysis failed',
        err.message,
        `<button class="btn-secondary" onclick="document.getElementById('ai-input-form').style.display='block';document.getElementById('ai-result-area').style.display='none'">Try again</button>`
      )}`;
  }
}

function renderAIResult(a, team1, team2, sport, odds1, odds2) {
  const sc = SPORT_COLOR[sport]||'#10b981';
  const trustMeta = buildAnalysisTrustMeta(a._meta || {}, a.confidence);
  document.getElementById('ai-result-area').innerHTML = `
    <div class="ai-result">
      <div class="ai-result-header">
        <div style="flex:1">
          <div style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700">${team1} vs ${team2}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${sport} · user-entered scenario</div>
        </div>
        ${a.valueBet?`<div class="value-bet-badge" style="padding:4px 10px;font-size:10px">💰 Potential value edge</div>`:''}
      </div>
      <div class="signal-source" style="margin:0 0 16px">
        <span class="signal-chip">User input</span>
        <span class="signal-chip">Generated insight</span>
        <span class="signal-chip">Not a guaranteed result</span>
      </div>
      ${renderTrustPattern(trustMeta, { title: 'Generated insight', compact: true })}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="ai-confidence-big">
          <div class="ai-conf-num" style="color:${confColor(a.confidence)}">${a.confidence}%</div>
          <div class="ai-conf-label">Signal confidence</div>
          <div class="conf-track" style="margin-top:10px"><div class="conf-fill" style="width:${a.confidence}%;background:${confColor(a.confidence)}"></div></div>
        </div>
        <div class="ai-rec">
          <div class="ai-rec-label">🎯 MODEL LEAN</div>
          <div class="ai-rec-bet">${a.recommendation}</div>
          <div class="ai-rec-odds">Reference price @ ${a.recommendedOdds || odds1 || odds2 || 'n/a'}</div>
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

      ${a.reasoning ? `<div class="ai-section">
        <div class="ai-section-title">Full Analysis</div>
        <div class="ai-section-body" style="line-height:1.8">${formatAIBold(a.reasoning)}</div>
      </div>` : ''}

      <div class="signal-source" style="margin-top:12px">
        <span class="signal-chip">Recommendation: ${a.recommendation}</span>
        <span class="signal-chip">Confidence: ${a.confidence}%</span>
        ${a.valueBet ? '<span class="signal-chip">Potential value edge</span>' : '<span class="signal-chip">No explicit value edge flagged</span>'}
      </div>

      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-primary" style="flex:1" onclick="closeAIModal();openBetFormPrefill('${team1} vs ${team2}','${a.recommendation}','${sport}','${a.recommendedOdds}',${a.confidence},${a.valueBet})">+ LOG THIS BET</button>
        <button class="btn-secondary" onclick="document.getElementById('ai-input-form').style.display='block';document.getElementById('ai-result-area').style.display='none'">← New Analysis</button>
      </div>

      <div class="ai-disclaimer">${a.disclaimer || 'AI-generated analysis should be treated as guidance, not certainty.'}</div>
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
