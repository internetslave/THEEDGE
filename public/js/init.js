// THE EDGE — INIT

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
