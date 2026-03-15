// THE EDGE — SHARED STATE

const BETS_KEY = 'edgeiq-bets-v1';
let bets = [];
let betSlip = [];
let editId = null;
let deleteId = null;
let currentSport = 'all';
let currentBetFilter = 'ALL';
let currentLbSport = 'overall';

// Odds state
let UPCOMING = [];
let oddsLoading = false;
let oddsLoaded = false;
let oddsLastUpdated = null;
let oddsNextRefresh = 21600;
let oddsPollTimer = null;
let oddsCreditsRemaining = null;

// Idle
let _lastActivity = Date.now();

// Auth
const TOKEN_KEY = 'edgeiq-token-v2';
let currentUser = null;

// UI state
let quickBetMatch = null;
let betSearchQuery = '';
let toastTimer = null;
let _factTimer = null;
let _factIdx = 0;

// Bookie sheet
let _bookieMatchId = null;
let _bookiePick = '';
let _bookieOdds = '';
let _bookieSport = '';
let _bookieStake = '';

// Cache
const weatherCache = {};
const SLIP_KEY = 'edgeiq-slip';
const DISCLAIMER_KEY = 'edgeiq-disclaimer-v1';
const BOOKIE_PREF_KEY = 'edgeiq-preferred-bookie';
