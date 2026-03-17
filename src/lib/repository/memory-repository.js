import { AI_TTL, ODDS_TTL } from '../../config/constants.js';
import { clone, normalizeCompCode, normalizeEmail, normalizeUsername, safeArray, safeObject, toEpochMs } from '../../utils/normalization.js';

function createDefaultState() {
  return {
    users: {},
    bets: {},
    tipping: { rounds: {}, results: {}, activeRound: null },
    comps: { comps: {}, memberships: {} },
    aiCache: {},
    oddsCache: {},
  };
}

function buildLeaderboardEntriesFromState(state) {
  return Object.keys(state.users).map((username) => {
    const user = state.users[username];
    const userBets = state.bets[username] || [];
    const settled = userBets.filter((bet) => bet.result && bet.result !== 'pending');
    const wins = settled.filter((bet) => bet.result === 'win').length;
    const totalStake = settled.reduce((sum, bet) => sum + (Number(bet.stake) || 0), 0);
    const totalReturn = settled
      .filter((bet) => bet.result === 'win')
      .reduce((sum, bet) => sum + ((Number(bet.stake) || 0) * (Number(bet.odds) || 1)), 0);

    return {
      username,
      avatar: user.avatar,
      color: user.color,
      totalBets: userBets.length,
      settled: settled.length,
      wins,
      losses: settled.length - wins,
      winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
      totalStake: Math.round(totalStake * 100) / 100,
      roi: totalStake > 0 ? Math.round(((totalReturn - totalStake) / totalStake) * 1000) / 10 : 0,
      recentResults: userBets.slice(-5).map((bet) => bet.result || 'pending'),
    };
  });
}

export class MemoryRepository {
  constructor() {
    this.mode = 'memory';
    this.state = createDefaultState();
  }

  async init() {}

  async close() {}

  getStats() {
    return {
      mode: this.mode,
      users: Object.keys(this.state.users).length,
      ready: true,
      hasDatabase: false,
    };
  }

  async countUsers() {
    return Object.keys(this.state.users).length;
  }

  async getUsersMap() {
    return clone(this.state.users);
  }

  async getUserByUsername(username) {
    const user = this.state.users[normalizeUsername(username)];
    return user ? clone({ username: normalizeUsername(username), ...user }) : null;
  }

  async createUser(user) {
    const username = normalizeUsername(user.username);
    this.state.users[username] = {
      pinHash: user.pinHash,
      salt: user.salt,
      sport: user.sport,
      avatar: user.avatar,
      color: user.color,
      email: normalizeEmail(user.email),
      role: user.role || null,
      sessionVersion: Number(user.sessionVersion) || 1,
      createdAt: user.createdAt || Date.now(),
    };
    return this.getUserByUsername(username);
  }

  async updateUser(username, updates) {
    const cleanUsername = normalizeUsername(username);
    if (!this.state.users[cleanUsername]) return null;
    this.state.users[cleanUsername] = {
      ...this.state.users[cleanUsername],
      ...updates,
      email: updates.email !== undefined ? normalizeEmail(updates.email) : this.state.users[cleanUsername].email,
      sessionVersion: updates.sessionVersion !== undefined
        ? (Number(updates.sessionVersion) || this.state.users[cleanUsername].sessionVersion || 1)
        : (this.state.users[cleanUsername].sessionVersion || 1),
    };
    return this.getUserByUsername(cleanUsername);
  }

  async bumpUserSessionVersion(username) {
    const cleanUsername = normalizeUsername(username);
    if (!this.state.users[cleanUsername]) return null;
    const current = Number(this.state.users[cleanUsername].sessionVersion) || 1;
    this.state.users[cleanUsername].sessionVersion = current + 1;
    return this.state.users[cleanUsername].sessionVersion;
  }

  async getUserBets(username) {
    return clone(this.state.bets[normalizeUsername(username)] || []);
  }

  async replaceUserBets(username, bets) {
    this.state.bets[normalizeUsername(username)] = clone(safeArray(bets));
  }

  async getLeaderboardEntries() {
    return buildLeaderboardEntriesFromState(this.state);
  }

  async getTippingState() {
    return clone(this.state.tipping);
  }

  async saveTippingRound(roundKey, roundData) {
    this.state.tipping.rounds[roundKey] = {
      ...clone(roundData),
      results: safeObject(roundData.results),
      fixtures: safeArray(roundData.fixtures),
    };
  }

  async setActiveTippingRound(roundKey) {
    this.state.tipping.activeRound = roundKey || null;
  }

  async saveTippingSubmission(roundKey, username, tips) {
    if (!this.state.tipping.results[roundKey]) this.state.tipping.results[roundKey] = {};
    this.state.tipping.results[roundKey][normalizeUsername(username)] = clone(safeObject(tips));
  }

  async saveRoundResults(roundKey, results) {
    if (!this.state.tipping.rounds[roundKey]) {
      this.state.tipping.rounds[roundKey] = { round: roundKey, fixtures: [], results: {} };
    }
    this.state.tipping.rounds[roundKey].results = clone(safeObject(results));
  }

  async getCompsState() {
    return clone(this.state.comps);
  }

  async createComp(comp) {
    const code = normalizeCompCode(comp.code);
    const creator = normalizeUsername(comp.creator);
    const members = [...new Set((safeArray(comp.members).map(normalizeUsername)))];
    if (this.state.comps.comps[code]) {
      throw new Error(`Comp ${code} already exists`);
    }

    this.state.comps.comps[code] = {
      code,
      name: String(comp.name || ''),
      sport: String(comp.sport || 'all'),
      creator,
      members,
      createdAt: comp.createdAt || new Date().toISOString(),
    };

    for (const member of members) {
      if (!this.state.comps.memberships[member]) this.state.comps.memberships[member] = [];
      if (!this.state.comps.memberships[member].includes(code)) this.state.comps.memberships[member].push(code);
    }
  }

  async addCompMembership(code, username) {
    const cleanCode = normalizeCompCode(code);
    const cleanUsername = normalizeUsername(username);
    const comp = this.state.comps.comps[cleanCode];
    if (!comp) return;

    if (!comp.members.includes(cleanUsername)) comp.members.push(cleanUsername);
    if (!this.state.comps.memberships[cleanUsername]) this.state.comps.memberships[cleanUsername] = [];
    if (!this.state.comps.memberships[cleanUsername].includes(cleanCode)) {
      this.state.comps.memberships[cleanUsername].push(cleanCode);
    }
  }

  async restoreAiCache() {
    const now = Date.now();
    const restored = {};

    for (const [eventId, entry] of Object.entries(this.state.aiCache)) {
      if (entry?.ts && now - entry.ts < AI_TTL) restored[eventId] = clone(entry);
      else delete this.state.aiCache[eventId];
    }

    return restored;
  }

  async saveAiCacheEntry(eventId, entry) {
    this.state.aiCache[eventId] = clone({
      data: entry.data,
      ts: toEpochMs(entry.ts),
    });
  }

  async removeAiCacheEntry(eventId) {
    delete this.state.aiCache[eventId];
  }

  async restoreOddsCache() {
    const now = Date.now();
    const restored = {};

    for (const [sportKey, entry] of Object.entries(this.state.oddsCache)) {
      if (entry?.ts && now - entry.ts < ODDS_TTL) restored[sportKey] = clone(entry);
      else delete this.state.oddsCache[sportKey];
    }

    return restored;
  }

  async saveOddsCacheEntry(sportKey, entry) {
    this.state.oddsCache[sportKey] = clone({
      data: safeArray(entry.data),
      ts: toEpochMs(entry.ts),
    });
  }

  async deleteOddsCacheEntry(sportKey) {
    delete this.state.oddsCache[sportKey];
  }

  async importSnapshot(snapshot, { reset = true } = {}) {
    if (reset) this.state = createDefaultState();

    this.state.users = {};
    for (const [rawUsername, user] of Object.entries(safeObject(snapshot.users))) {
      const username = normalizeUsername(rawUsername);
      this.state.users[username] = {
        pinHash: user.pinHash,
        salt: user.salt,
        sport: user.sport || 'AFL',
        avatar: user.avatar || '🎯',
        color: user.color || '#aaa',
      email: normalizeEmail(user.email || ''),
      role: user.role || null,
      sessionVersion: Number(user.sessionVersion) || 1,
      createdAt: toEpochMs(user.createdAt),
    };
  }

    this.state.bets = {};
    for (const [rawUsername, bets] of Object.entries(safeObject(snapshot.bets))) {
      this.state.bets[normalizeUsername(rawUsername)] = clone(safeArray(bets));
    }

    this.state.tipping = {
      rounds: clone(safeObject(snapshot.tipping?.rounds)),
      results: clone(safeObject(snapshot.tipping?.results)),
      activeRound: snapshot.tipping?.activeRound || null,
    };
    this.state.comps = {
      comps: clone(safeObject(snapshot.comps?.comps)),
      memberships: clone(safeObject(snapshot.comps?.memberships)),
    };
    this.state.aiCache = clone(safeObject(snapshot.aiCache));
    this.state.oddsCache = clone(safeObject(snapshot.oddsCache));
  }
}
