import { analyseMatch, deleteCachedAnalysis, hasFreshAnalysis, queueAIAnalysis } from '../services/analysis-service.js';
import { buildOddsEvents, getOddsUsage } from '../services/odds-service.js';
import { logger, toErrorMeta, toRequestMeta } from '../lib/logger.js';
import { handleControllerError } from '../utils/controller.js';
import { clampNumber, sanitizeStringArray, sanitizeText } from '../utils/validation.js';

function toNumber(value) {
  return clampNumber(value, { min: 1, max: 1000, fallback: null });
}

function normalizeAnalysePayload(body = {}) {
  if (body.event?.id) {
    const event = body.event || {};
    return {
      event: {
        id: sanitizeText(event.id, { maxLength: 120 }),
        home: sanitizeText(event.home, { maxLength: 80 }),
        away: sanitizeText(event.away, { maxLength: 80 }),
        sport: sanitizeText(event.sport || 'Other', { maxLength: 24 }) || 'Other',
        homeOdds: toNumber(event.homeOdds),
        awayOdds: toNumber(event.awayOdds),
        drawOdds: toNumber(event.drawOdds),
        comp: sanitizeText(event.comp, { maxLength: 80 }),
        venue: sanitizeText(event.venue, { maxLength: 80 }),
        context: sanitizeText(event.context, { maxLength: 240, allowNewlines: true }),
      },
      playerMarkets: normalizePlayerMarkets(body.playerMarkets || null),
    };
  }

  if (!body.home || !body.away) {
    return { event: null, playerMarkets: null };
  }

  const safeSport = sanitizeText(body.sport || 'sport', { maxLength: 24 }) || 'sport';
  const safeHome = sanitizeText(body.home, { maxLength: 80 });
  const safeAway = sanitizeText(body.away, { maxLength: 80 });
  const safeId = `${safeSport}_${safeHome}_${safeAway}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return {
    event: {
      id: `manual_${safeId || 'scenario'}`,
      home: safeHome,
      away: safeAway,
      sport: safeSport || 'Other',
      homeOdds: toNumber(body.homeOdds),
      awayOdds: toNumber(body.awayOdds),
      drawOdds: toNumber(body.drawOdds),
      comp: sanitizeText(body.comp, { maxLength: 80 }),
      venue: sanitizeText(body.venue, { maxLength: 80 }),
      context: sanitizeText(body.context, { maxLength: 240, allowNewlines: true }),
    },
    playerMarkets: normalizePlayerMarkets(body.playerMarkets || null),
  };
}

function normalizePlayerMarkets(playerMarkets) {
  if (!playerMarkets || typeof playerMarkets !== 'object') return null;
  return {
    firstGoal: sanitizeStringArray(playerMarkets.firstGoal, { maxItems: 16, itemMaxLength: 60 }),
    disposals: sanitizeStringArray(playerMarkets.disposals, { maxItems: 16, itemMaxLength: 60 }),
    tryscorers: sanitizeStringArray(playerMarkets.tryscorers, { maxItems: 16, itemMaxLength: 60 }),
    pointsPlayers: sanitizeStringArray(playerMarkets.pointsPlayers, { maxItems: 16, itemMaxLength: 60 }),
  };
}

export async function getOdds(req, res) {
  try {
    const payload = await buildOddsEvents();
    queueAIAnalysis(payload.events.filter((event) => !event.aiReady && !event.isRacing));
    res.json(payload);
  } catch (error) {
    logger.error('odds.request.failed', {
      ...toRequestMeta(req),
      error: toErrorMeta(error),
    });
    res.status(500).json({
      success: false,
      errorType: 'odds-unavailable',
      error: 'We could not reach the odds feeds right now. Try again shortly.',
    });
  }
}

export function getOddsUsageStatus(req, res) {
  res.json(getOddsUsage());
}

export async function analyse(req, res) {
  const { event, playerMarkets } = normalizeAnalysePayload(req.body || {});
  if (!event?.id) {
    return res.status(400).json({
      success: false,
      errorType: 'validation',
      error: 'Match details are required before analysis can run.',
    });
  }

  try {
    if (hasFreshAnalysis(event.id)) {
      const cached = await analyseMatch(event, playerMarkets || null);
      if (!cached?.props || (playerMarkets && !cached.playerPicks)) {
        await deleteCachedAnalysis(event.id);
      } else {
        return res.json({ success: true, analysis: cached });
      }
    }

    const analysis = await analyseMatch(event, playerMarkets || null);
    if (!analysis) {
      return res.status(503).json({
        success: false,
        errorType: 'ai-unavailable',
        error: 'AI analysis is temporarily unavailable. Market data and tracked bets are still available.',
      });
    }
    if (analysis._error) {
      return res.status(402).json({ success: false, errorType: analysis._error, error: analysis.message });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    handleControllerError(res, error, 'Analysis failed');
  }
}
