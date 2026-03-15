// THE EDGE — INIT

// Fetch roster pools from server so they can be updated without redeploying
(async function loadRosters() {
  try {
    const r = await fetch('/api/rosters');
    if (!r.ok) return;
    const d = await r.json();
    if (d.rosters) {
      if (d.rosters.AFL_FWDS)   AFL_FWDS   = d.rosters.AFL_FWDS;
      if (d.rosters.AFL_MIDS)   AFL_MIDS   = d.rosters.AFL_MIDS;
      if (d.rosters.NRL_BACKS)  NRL_BACKS  = d.rosters.NRL_BACKS;
      if (d.rosters.NRL_HALVES) NRL_HALVES = d.rosters.NRL_HALVES;
      if (d.rosters.NBA_POOL)   NBA_POOL   = d.rosters.NBA_POOL;
    }
  } catch { /* non-fatal — markets fall back to empty pools gracefully */ }
})();

// Idle detection
['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, () => { _lastActivity = Date.now(); }, { passive: true });
});

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeBetForm(); closeConfirm(); closeAIModal(); closeMatchModal(); closeQuickBet(); closeBookieSheet();
  }
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') {
    const isSignup = document.getElementById('auth-signup').style.display !== 'none';
    if (isSignup) doSignUp(); else doSignIn();
  }
});

// Restore bet slip
(function initSlip() {
  try { betSlip = JSON.parse(localStorage.getItem('edgeiq-slip') || '[]'); } catch { betSlip = []; }
  setTimeout(updateSlipFab, 200);
})();

// Update badge timer
setInterval(updateLastUpdatedBadge, 60 * 1000);

// Disclaimer
function showDisclaimerIfNeeded() {
  if (!localStorage.getItem(DISCLAIMER_KEY)) {
    document.getElementById('disclaimer-modal').style.display = 'flex';
  }
}
function acceptDisclaimer() {
  localStorage.setItem(DISCLAIMER_KEY, '1');
  document.getElementById('disclaimer-modal').style.display = 'none';
}
