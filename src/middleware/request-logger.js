import crypto from 'crypto';
import { logger } from '../lib/logger.js';

function shouldSkipLog(req, res) {
  if (!req.path.startsWith('/api/health')) return false;
  return res.statusCode < 400;
}

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (shouldSkipLog(req, res)) return;

    const entry = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      route: req.route?.path || null,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      clientIp: req.clientIp || req.ip || null,
    };

    if (res.statusCode >= 500) {
      logger.error('request.failed', entry);
    } else if ([401, 403, 429].includes(res.statusCode) || durationMs >= 1500) {
      logger.warn('request.completed', entry);
    } else if (res.statusCode >= 400) {
      logger.info('request.completed', entry);
    } else if (req.path.startsWith('/api')) {
      logger.info('request.completed', entry);
    } else if (durationMs >= 3000) {
      logger.warn('request.slow_page', entry);
    }
  });

  next();
}
