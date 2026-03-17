// THE EDGE — AUTH
// Must load AFTER render.js (overrides saveBets & showLbSport)

function getToken()      { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)     { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()    { localStorage.removeItem(TOKEN_KEY); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'x-session-token': getToken() || '' };
}

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
    resEl.innerHTML = `✅ Recovery request received.<br><span style="color:var(--muted)">${data.message || 'If that account exists, the request has been recorded.'}</span>`;
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
  const userSub = document.getElementById('user-sub');
  if (userSub) userSub.textContent = `${profile.sport || 'All sports'} · Starter plan`;
  const planBadge = document.getElementById('plan-badge');
  if (planBadge) planBadge.textContent = bets.length >= 5 ? 'Starter active' : 'Starter';
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
  const summaryEl = document.getElementById('lb-summary');
  if (summaryEl) summaryEl.innerHTML = '';
  document.getElementById('lb-content').innerHTML = renderStateEmpty('🏆', 'Loading leaderboard', 'Pulling the latest tracked performance across all active accounts.');
  try {
    const r = await fetch('/api/leaderboard');
    const d = await r.json();
    const allEntries = (d.entries || []).filter(e => e.totalBets > 0).sort((a,b) => b.roi - a.roi);

    // Render aggregate extras (best ROI, most wins, streak)
    renderLbExtras(allEntries);

    const rankEmoji  = ['🥇','🥈','🥉'];
    const rankColors = ['#10b981','#94a3b8','#f97316'];
    const totalTracked = allEntries.reduce((sum, entry) => sum + (entry.totalBets || 0), 0);
    const totalSettled = allEntries.reduce((sum, entry) => sum + (entry.settled || 0), 0);
    const avgRoi = allEntries.length ? (allEntries.reduce((sum, entry) => sum + (entry.roi || 0), 0) / allEntries.length).toFixed(1) : '0.0';
    if (summaryEl && allEntries.length) {
      summaryEl.innerHTML = `
        <div class="lb-summary-grid">
          <div class="lb-summary-card">
            <div class="lb-summary-label">Active Accounts</div>
            <div class="lb-summary-value">${allEntries.length}</div>
          </div>
          <div class="lb-summary-card">
            <div class="lb-summary-label">Tracked Bets</div>
            <div class="lb-summary-value">${totalTracked}</div>
          </div>
          <div class="lb-summary-card">
            <div class="lb-summary-label">Settled Bets</div>
            <div class="lb-summary-value">${totalSettled}</div>
          </div>
        </div>
        <div class="suite-inline-note" style="margin-bottom:14px">Leaderboard performance is based on user-tracked bets. ROI and win rate only count settled results, while pending bets stay visible separately.</div>
        ${allEntries.length >= 3 ? `
          <div class="lb-podium">
            ${allEntries.slice(0,3).map((entry, idx) => `
              <div class="lb-podium-card">
                <div class="podium-rank" style="color:${rankColors[idx]}">${rankEmoji[idx]} Rank ${idx + 1}</div>
                <div class="podium-name" style="color:${entry.color}">${entry.avatar} ${entry.username.toUpperCase()}</div>
                <div class="podium-metric" style="color:${entry.roi >= 0 ? '#7ef7d2' : '#fca5a5'}">${entry.roi >= 0 ? '+' : ''}${entry.roi}%</div>
                <div class="lb-meta">${entry.totalBets} bets tracked · ${entry.settled} settled · ${entry.wins} wins · ${entry.winRate}% win rate</div>
              </div>`).join('')}
          </div>` : ''}
      `;
    }

    document.getElementById('lb-content').innerHTML = allEntries.length < 2
      ? renderStateEmpty(
          '👥',
          'Waiting for more competitors',
          'Share EdgeIQ with your crew so each account can log bets and automatically appear on the leaderboard.',
          `<button class="btn-secondary" onclick="navigator.clipboard.writeText('${window.location.origin}');showToast('📋 Link copied', false)">Copy invite link</button>`
        )
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
          return `<div class="lb-card" ${isMe?'style="border-color:rgba(16,185,129,.25);background:linear-gradient(90deg,rgba(40,72,76,.34),rgba(10,18,33,.88))"':''}>
            <div class="lb-rank" style="color:${i<3?rankColors[i]:'var(--muted)'}">${i<3?rankEmoji[i]:'#'+(i+1)}</div>
            <div class="lb-avatar" style="background:${e.color}18;border:1px solid ${e.color}40">${e.avatar}</div>
            <div class="lb-info">
              <div class="lb-name" style="color:${e.color}">${e.username.toUpperCase()}${isMe?'<span class="lb-you">YOU</span>':''}${streakBadge}</div>
              <div class="lb-meta">${e.totalBets} tracked · ${e.settled} settled · ${e.wins} wins · ${e.winRate}% WR · ROI ${e.roi}%</div>
            </div>
            <div class="lb-pnl" style="color:${pos?'#10b981':'#ef4444'}">${e.roi >= 0 ? '+' : ''}${e.roi}%</div>
          </div>`;
        }).join('');
  } catch(e) {
    if (summaryEl) summaryEl.innerHTML = '';
    document.getElementById('lb-content').innerHTML = renderStateEmpty(
      '⚠️',
      'Could not load leaderboard',
      'We could not retrieve the latest standings right now. Please try again in a moment.'
    );
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
