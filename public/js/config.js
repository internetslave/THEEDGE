// THE EDGE — CONFIGURATION

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


setInterval(updateLastUpdatedBadge, 60 * 1000);

// ── Sample H2H data ──
const H2H = {
  'Collingwood_Richmond': { home:8, away:6, draws:0, last5:['W','L','W','W','L'] },
  'Geelong_Brisbane':     { home:5, away:7, draws:0, last5:['L','W','L','L','W'] },
  'Melbourne Storm_Penrith Panthers': { home:6, away:7, draws:1, last5:['L','W','L','W','W'] },
};

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


function openBookieSheet(matchId, pick, odds, sport, stake) {
  _bookieMatchId = matchId;
