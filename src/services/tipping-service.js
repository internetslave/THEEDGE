import crypto from 'crypto';
import { env } from '../config/env.js';
import { getRepository } from '../lib/repository/index.js';
import { ServiceError } from '../utils/service-error.js';
import { normalizeCompCode, normalizeUsername, safeObject } from '../utils/normalization.js';
import { clampInteger, clampNumber, sanitizeBoolean, sanitizeIsoDate, sanitizeText } from '../utils/validation.js';

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function scoreOnePick(pick, result) {
  if (!result || result.status !== 'final') return null;

  let pts = 0;
  const correct = pick.tip === result.winner;
  if (correct) {
    pts += 1;
    if (pick.confidence) pts += Math.round((pick.confidence / 8) * 4 * 10) / 10;
    if (pick.margin != null && result.margin != null) {
      const diff = Math.abs(pick.margin - result.margin);
      if (diff === 0) pts += 5;
      else if (diff <= 6) pts += 2;
      else if (diff <= 12) pts += 1;
    }
  }

  if (pick.banker) pts *= 2;
  return { pts: Math.round(pts * 10) / 10, correct };
}

async function requireAdminUser(username) {
  const user = await getRepository().getUserByUsername(username);
  if (user?.role !== 'admin') {
    throw new ServiceError(403, 'Admin only');
  }
}

function sanitizeFixture(fixture, index) {
  const item = safeObject(fixture);
  const home = sanitizeText(item.home, { maxLength: 80 });
  const away = sanitizeText(item.away, { maxLength: 80 });
  const id = sanitizeText(item.id, { maxLength: 80 }) || `fixture_${index + 1}`;

  if (!home || !away) return null;

  return {
    id,
    home,
    away,
    homeOdds: clampNumber(item.homeOdds, { min: 1, max: 1000, fallback: null }),
    awayOdds: clampNumber(item.awayOdds, { min: 1, max: 1000, fallback: null }),
    homeRecord: sanitizeText(item.homeRecord, { maxLength: 80 }),
    awayRecord: sanitizeText(item.awayRecord, { maxLength: 80 }),
    time: sanitizeText(item.time, { maxLength: 60 }),
    venue: sanitizeText(item.venue, { maxLength: 80 }),
    start: sanitizeIsoDate(item.start, null),
  };
}

export async function getFixtures() {
  const tipping = await getRepository().getTippingState();
  if (!tipping.activeRound || !tipping.rounds[tipping.activeRound]) {
    return { round: null, lockout: null, fixtures: [] };
  }

  const round = tipping.rounds[tipping.activeRound];
  return { round: tipping.activeRound, lockout: round.lockout || null, fixtures: round.fixtures || [] };
}

export async function getMyTips(username) {
  const tipping = await getRepository().getTippingState();
  const tips = tipping.activeRound ? (tipping.results[tipping.activeRound] || {})[username] || {} : {};
  return { round: tipping.activeRound, tips };
}

export async function submitTips(username, tips) {
  if (!tips || typeof tips !== 'object') throw new ServiceError(400, 'Invalid tips');

  const repository = getRepository();
  const tipping = await repository.getTippingState();
  if (!tipping.activeRound) throw new ServiceError(400, 'No active round');

  const round = tipping.rounds[tipping.activeRound];
  if (round.lockout && new Date() > new Date(round.lockout)) throw new ServiceError(400, 'Round has locked out');

  const validIds = new Set((round.fixtures || []).map((fixture) => fixture.id));
  const clean = {};

  for (const [id, tip] of Object.entries(tips)) {
    if (!validIds.has(id) || !tip.tip) continue;
    clean[id] = {
      tip: sanitizeText(tip.tip, { maxLength: 80 }),
      margin: tip.margin != null ? clampInteger(tip.margin, { min: 0, max: 200, fallback: 0 }) : null,
      confidence: tip.confidence ? clampInteger(tip.confidence, { min: 1, max: 8, fallback: null }) : null,
      banker: sanitizeBoolean(tip.banker),
      submittedAt: new Date().toISOString(),
    };
  }

  await repository.saveTippingSubmission(tipping.activeRound, username, clean);
  return { success: true, tipsCount: Object.keys(clean).length };
}

export async function buildTippingLeaderboard() {
  const repository = getRepository();
  const [tipping, users] = await Promise.all([repository.getTippingState(), repository.getUsersMap()]);
  const scores = {};

  for (const [round, roundResults] of Object.entries(tipping.results || {})) {
    const results = tipping.rounds[round]?.results || {};
    for (const [username, tips] of Object.entries(roundResults)) {
      if (!scores[username]) scores[username] = { total: 0, correct: 0, tips: 0, rounds: {} };

      let roundPoints = 0;
      let roundCorrect = 0;
      for (const [fixtureId, pick] of Object.entries(tips)) {
        const score = scoreOnePick(pick, results[fixtureId]);
        if (score) {
          roundPoints += score.pts;
          if (score.correct) roundCorrect += 1;
          scores[username].tips += 1;
        }
      }

      scores[username].total += roundPoints;
      scores[username].correct += roundCorrect;
      scores[username].rounds[round] = { pts: roundPoints, correct: roundCorrect };
    }
  }

  const board = Object.entries(scores)
    .map(([username, score]) => ({
      username,
      avatar: users[username]?.avatar || '🎯',
      color: users[username]?.color || '#aaa',
      total: Math.round(score.total * 10) / 10,
      correct: score.correct,
      tips: score.tips,
      winRate: score.tips ? Math.round((score.correct / score.tips) * 100) : 0,
      rounds: score.rounds,
    }))
    .sort((a, b) => b.total - a.total);

  return { board, activeRound: tipping.activeRound };
}

export async function getRoundResults(round) {
  const cleanRound = String(round || '').substring(0, 80);
  if (!cleanRound) throw new ServiceError(400, 'round required');

  const tipping = await getRepository().getTippingState();
  const roundData = tipping.rounds[cleanRound];
  if (!roundData) throw new ServiceError(404, 'Round not found');

  return { round: cleanRound, fixtures: roundData.fixtures, results: roundData.results || {} };
}

export async function createComp(username, { name, sport }) {
  if (!name) throw new ServiceError(400, 'Name required');
  const cleanName = sanitizeText(name, { maxLength: 50 });
  if (!cleanName) throw new ServiceError(400, 'Name required');

  const repository = getRepository();
  const comps = await repository.getCompsState();
  let code = generateCode();
  let attempts = 0;

  while (comps.comps[code] && attempts < 5) {
    code = generateCode();
    attempts += 1;
  }

  if (comps.comps[code]) throw new ServiceError(500, 'Unable to generate a unique comp code');

  const comp = {
    code,
    name: cleanName,
    sport: sanitizeText(sport || 'all', { maxLength: 24 }) || 'all',
    creator: username,
    members: [username],
    createdAt: new Date().toISOString(),
  };

  await repository.createComp(comp);
  return { success: true, code, comp };
}

export async function joinComp(username, code) {
  if (!code) throw new ServiceError(400, 'Code required');

  const cleanCode = normalizeCompCode(code);
  if (!/^[A-F0-9]{6}$/.test(cleanCode)) throw new ServiceError(400, 'Invalid comp code format');

  const repository = getRepository();
  const comps = await repository.getCompsState();
  const comp = comps.comps[cleanCode];
  if (!comp) throw new ServiceError(404, 'Comp not found — check your code');
  if (comp.members.includes(username)) throw new ServiceError(400, 'Already in this comp');
  if (comp.members.length >= 200) throw new ServiceError(400, 'Comp is full (max 200 members)');

  await repository.addCompMembership(cleanCode, username);

  return {
    success: true,
    comp: {
      code: comp.code,
      name: comp.name,
      sport: comp.sport,
      members: comp.members.length + 1,
    },
  };
}

export async function getMyComps(username) {
  const repository = getRepository();
  const [comps, tipping, users] = await Promise.all([
    repository.getCompsState(),
    repository.getTippingState(),
    repository.getUsersMap(),
  ]);

  const myComps = (comps.memberships[username] || []).map((code) => {
    const comp = comps.comps[code];
    if (!comp) return null;

    const scores = {};
    for (const [round, roundResults] of Object.entries(tipping.results || {})) {
      const results = tipping.rounds[round]?.results || {};
      for (const member of comp.members) {
        if (!scores[member]) scores[member] = { total: 0, correct: 0, tips: 0 };
        for (const [fixtureId, pick] of Object.entries(roundResults[member] || {})) {
          const score = scoreOnePick(pick, results[fixtureId]);
          if (score) {
            scores[member].total += score.pts;
            if (score.correct) scores[member].correct += 1;
            scores[member].tips += 1;
          }
        }
      }
    }

    return {
      ...comp,
      board: comp.members.map((member) => ({
        username: member,
        avatar: users[member]?.avatar || '🎯',
        color: users[member]?.color || '#aaa',
        total: Math.round((scores[member]?.total || 0) * 10) / 10,
        correct: scores[member]?.correct || 0,
        tips: scores[member]?.tips || 0,
      })).sort((a, b) => b.total - a.total),
    };
  }).filter(Boolean);

  return { comps: myComps };
}

export async function createRound(adminUsername, { round, sport, lockout, fixtures }) {
  await requireAdminUser(adminUsername);
  if (!round || !fixtures) throw new ServiceError(400, 'Round and fixtures required');

  const cleanRound = sanitizeText(round, { maxLength: 80 });
  const cleanSport = sanitizeText(sport || 'AFL', { maxLength: 24 }) || 'AFL';
  const cleanFixtures = Array.isArray(fixtures)
    ? fixtures.slice(0, 32).map(sanitizeFixture).filter(Boolean)
    : [];
  if (!cleanRound || !cleanFixtures.length) throw new ServiceError(400, 'A valid round and fixture list are required');

  const repository = getRepository();
  const tipping = await repository.getTippingState();
  await repository.saveTippingRound(cleanRound, {
    round: cleanRound,
    sport: cleanSport,
    lockout: sanitizeIsoDate(lockout, null),
    fixtures: cleanFixtures,
    results: tipping.rounds[cleanRound]?.results || {},
  });
  await repository.setActiveTippingRound(cleanRound);

  return { success: true, round: cleanRound };
}

export async function recordRoundResult(adminUsername, { round, fixtureId, winner, margin }) {
  await requireAdminUser(adminUsername);
  if (!round || !fixtureId || !winner) throw new ServiceError(400, 'round, fixtureId, winner required');

  const cleanRound = sanitizeText(round, { maxLength: 80 });
  const cleanFixtureId = sanitizeText(fixtureId, { maxLength: 80 });
  const cleanWinner = sanitizeText(winner, { maxLength: 80 });

  const repository = getRepository();
  const tipping = await repository.getTippingState();
  if (!tipping.rounds[cleanRound]) throw new ServiceError(404, 'Round not found');

  const results = {
    ...(tipping.rounds[cleanRound].results || {}),
    [cleanFixtureId]: {
      winner: cleanWinner,
      margin: margin != null ? clampInteger(margin, { min: 0, max: 200, fallback: null }) : null,
      status: 'final',
    },
  };

  await repository.saveRoundResults(cleanRound, results);
  return { success: true };
}

export async function setUserRole({ actorUsername, secret, adminSecret, username, role }) {
  const repository = getRepository();
  const cleanUsername = normalizeUsername(username);
  const cleanRole = role === 'admin' ? 'admin' : null;

  if (!cleanUsername) throw new ServiceError(400, 'username required');

  if (actorUsername) {
    await requireAdminUser(actorUsername);
  } else {
    const users = await repository.getUsersMap();
    const hasAdmin = Object.values(users).some((user) => user?.role === 'admin');
    if (hasAdmin) throw new ServiceError(403, 'Admin authentication required');
    const providedSecret = secret || adminSecret;
    if (!env.ADMIN_BOOTSTRAP_SECRET || providedSecret !== env.ADMIN_BOOTSTRAP_SECRET) {
      throw new ServiceError(403, 'Bootstrap secret required');
    }
  }

  const user = await repository.getUserByUsername(cleanUsername);
  if (!user) throw new ServiceError(404, 'User not found');

  await repository.updateUser(cleanUsername, { role: cleanRole });
  return { success: true };
}
