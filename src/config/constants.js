export const ODDS_BASE = 'https://api.the-odds-api.com/v4';
export const RACING_BASE = 'https://api.theracingapi.com/v1';

export const AI_TTL = 12 * 60 * 60 * 1000;
export const ODDS_TTL = 6 * 60 * 60 * 1000;
export const RACING_TTL = 15 * 60 * 1000;
export const WEATHER_PROXY_TTL = 30 * 60 * 1000;
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 10 * 60 * 1000;

export const AVATARS = ['🎯', '🔥', '⚡', '💰', '🏆', '🦊', '🐆', '🌟', '🎲', '🃏'];
export const COLORS = ['#f0b429', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#e8314a', '#00c85a', '#f59e0b'];

export const ALL_SPORTS = [
  { key: 'aussierules_afl', label: 'afl', regions: 'au' },
  { key: 'rugbyleague_nrl', label: 'nrl', regions: 'au' },
  { key: 'soccer_australia_aleague', label: 'soccer_al', regions: 'au' },
  { key: 'soccer_epl', label: 'soccer_epl', regions: 'au' },
  { key: 'mma_mixed_martial_arts', label: 'ufc', regions: 'au' },
  { key: 'boxing_boxing', label: 'boxing', regions: 'au' },
  { key: 'basketball_nba', label: 'nba', regions: 'us' },
];

export const ALLOWED_ORIGINS = new Set([
  'https://edgebets.net',
  'https://www.edgebets.net',
]);

export const VALID_RESULTS = new Set(['win', 'loss', 'push', 'pending']);
export const VALID_SPORTS = new Set(['AFL', 'NRL', 'NBA', 'Soccer', 'UFC', 'Boxing', 'Horse Racing', 'Greyhound', 'Other']);
export const MAX_BETS = 500;

export const FANTASY_SYSTEM = 'You are a sports fantasy and betting analysis assistant for EdgeIQ. You only answer questions related to sports, fantasy sports, betting strategy, player analysis, and match previews. If asked about anything outside sports — politics, harmful content, personal data, code exploits, or any other off-topic subject — politely decline and redirect to sports topics.';

export const ROSTERS = {
  AFL_FWDS: [
    'Charlie Curnow', 'Jeremy Cameron', 'Tom Hawkins', 'Tom Lynch', 'Joe Daniher',
    'Nick Riewoldt', 'Jack Gunston', 'Josh Bruce', 'Mitch Lewis', 'Harry McKay',
    'Eric Hipwood', 'Matthew Owies', 'Aaron Naughton', 'Toby McLean', 'Paddy Ryder',
    'Coleman-Jones', 'Jack Lukosius', 'Mabior Chol', 'Peter Ladhams', 'Sam Hayes',
    'Charlie Dixon', 'Jy Farrar', 'Jack Billings', 'Tyler Brockman', 'Callum Brown',
    'Sam Butler', 'Jake Stringer', 'Jonathon Patton', 'Max King', 'Ben Brown'
  ],
  AFL_MIDS: [
    'Patrick Dangerfield', 'Marcus Bontempelli', 'Clayton Oliver', 'Lachie Neale',
    'Josh Kelly', 'Andrew Brayshaw', 'Tom Mitchell', 'Jack Steele', 'Patrick Cripps',
    'Dustin Martin', 'Christian Petracca', 'Zach Merrett', 'Rory Laird', 'Sam Walsh',
    'Jordan Dawson', 'Brandon Ellis', 'Tim Taranto', 'James Sicily', 'Nick Daicos',
    'Will Ashcroft', 'Caleb Serong', 'Bailey Smith', 'Jackson Macrae', 'Rowan Marshall',
    'Darcy Parish', 'Jaeger O\'Meara', 'Lachlan Sholl', 'Jai Newcombe', 'Matt Rowell', 'Noah Anderson'
  ],
  NRL_BACKS: [
    'James Tedesco', 'Latrell Mitchell', 'Ryan Papenhuyzen', 'Tom Trbojevic',
    'Joseph Suaalii', 'Zac Lomax', 'Selwyn Cobbo', 'Xavier Coates', 'Kotoni Staggs',
    'Brian To\'o', 'David Nofoaluma', 'Josh Addo-Carr', 'Valentine Holmes', 'Matt Dufty',
    'Murray Taulagi', 'Hamiso Tabuai-Fidow', 'Jack Bird', 'Kyle Feldt', 'Albert Hopoate',
    'Corey Oates', 'Dominic Young', 'Kalyn Ponga', 'Jack Wighton', 'Brent Naden',
    'Reimis Smith', 'Josh Mansour', 'Ronaldo mulitalo', 'Bradman Best', 'Siosifa Talakai', 'Dane Gagai'
  ],
  NRL_HALVES: [
    'Nathan Cleary', 'Daly Cherry-Evans', 'Cameron Munster', 'Jarome Luai',
    'Adam Reynolds', 'Nicho Hynes', 'Luke Brooks', 'Lachlan Galvin', 'Cody Walker',
    'Shaun Johnson', 'AJ Brimson', 'Jayden Sullivan', 'Tommy Talau', 'Kyle Flanagan',
    'Mitch Moses', 'Ben Hunt', 'Andrew Johns', 'Jake Friend', 'Api Koroisau', 'Damien Cook'
  ],
  NBA_POOL: [
    'Jayson Tatum', 'Jaylen Brown', 'LeBron James', 'Anthony Davis', 'Stephen Curry',
    'Kevin Durant', 'Devin Booker', 'Joel Embiid', 'Shai Gilgeous-Alexander', 'Nikola Jokic',
    'Giannis Antetokounmpo', 'Damian Lillard', 'Karl-Anthony Towns', 'Jalen Brunson',
    'Donovan Mitchell', 'Tyrese Haliburton', 'De\'Aaron Fox', 'Anthony Edwards',
    'Luka Doncic', 'Kyrie Irving', 'Kawhi Leonard', 'Paul George', 'Trae Young',
    'Zion Williamson', 'CJ McCollum', 'Darius Garland', 'Ja Morant', 'Bam Adebayo',
    'Lauri Markkanen', 'Desmond Bane'
  ]
};
