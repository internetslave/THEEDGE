import { env } from '../config/env.js';
import { getRepositoryStats } from '../lib/repository/index.js';
import { logger, toErrorMeta, toRequestMeta } from '../lib/logger.js';

function buildDependencyStatus() {
  return {
    oddsApiConfigured: !!env.ODDS_API_KEY,
    anthropicConfigured: !!env.ANTHROPIC_API_KEY,
    racingApiConfigured: !!(env.RACING_API_USER && env.RACING_API_PASS),
  };
}

export async function getHealth(req, res) {
  const repository = await getRepositoryStats();
  res.json({
    status: repository.ready ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    version: env.APP_VERSION,
    storage: repository,
    dependencies: buildDependencyStatus(),
  });
}

export function getLiveness(req, res) {
  res.json({
    status: 'alive',
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    version: env.APP_VERSION,
  });
}

export async function getReadiness(req, res) {
  try {
    const repository = await getRepositoryStats();
    const ready = !!repository.ready;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      time: new Date().toISOString(),
      storage: repository,
      dependencies: buildDependencyStatus(),
    });
  } catch (error) {
    logger.error('health.readiness_failed', {
      ...toRequestMeta(req),
      error: toErrorMeta(error),
    });
    res.status(503).json({
      status: 'not-ready',
      time: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
}
