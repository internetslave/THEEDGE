import { MAX_BETS, VALID_RESULTS, VALID_SPORTS } from '../config/constants.js';
import { getRepository } from '../lib/repository/index.js';
import { ServiceError } from '../utils/service-error.js';
import { clampNumber, sanitizeIsoDate, sanitizeText } from '../utils/validation.js';

export async function getUserBets(username) {
  return getRepository().getUserBets(username);
}

export async function saveUserBets(username, newBets) {
  if (!Array.isArray(newBets)) throw new ServiceError(400, 'bets must be an array');
  if (newBets.length > MAX_BETS) throw new ServiceError(400, `Maximum ${MAX_BETS} bets`);

  const clean = newBets.map((bet) => {
    if (!bet || typeof bet !== 'object') return null;
    const stake = clampNumber(bet.stake, { min: 0, max: 1_000_000, fallback: 0 });
    const odds = clampNumber(bet.odds, { min: 1, max: 1000, fallback: 1 });
    const result = VALID_RESULTS.has(bet.result) ? bet.result : 'pending';
    const match = sanitizeText(bet.match || bet.event, { maxLength: 120 });
    const team = sanitizeText(bet.team || bet.bet, { maxLength: 60 });
    const labelParts = [
      sanitizeText(bet.betType, { maxLength: 40 }),
      sanitizeText(bet.venue, { maxLength: 40 }),
      sanitizeText(bet.comp, { maxLength: 40 }),
      bet.aiRecommended ? 'AI-assisted' : '',
      bet.valueBet ? 'Value-flagged' : '',
    ].filter(Boolean);

    return {
      id: sanitizeText(bet.id, { maxLength: 64 }),
      match,
      team,
      sport: VALID_SPORTS.has(bet.sport) ? bet.sport : 'Other',
      stake,
      odds,
      result,
      date: sanitizeIsoDate(bet.date),
      label: sanitizeText(bet.label || labelParts.join(' · '), { maxLength: 120 }),
      notes: sanitizeText(bet.notes, { maxLength: 300, allowNewlines: true }),
    };
  }).filter(Boolean);

  await getRepository().replaceUserBets(username, clean);

  return { success: true };
}
