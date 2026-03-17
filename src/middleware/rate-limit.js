import { logger } from '../lib/logger.js';

const rateLimitStore = new Map();
const rateLimitLogger = logger.child({ component: 'rate-limit' });

export function makeRateLimit(maxReqs, windowMs, message = 'Too many requests — try again shortly', options = {}) {
  return (req, res, next) => {
    const ip = String(req.clientIp || req.ip || req.socket?.remoteAddress || 'unknown').trim();
    const now = Date.now();
    const key = typeof options.keyFn === 'function'
      ? options.keyFn(req, ip)
      : `${ip}:${options.bucket || req.baseUrl || ''}${req.path}`;
    const record = rateLimitStore.get(key) || { count: 0, start: now };

    if (now - record.start > windowMs) {
      record.count = 1;
      record.start = now;
    } else {
      record.count += 1;
    }

    rateLimitStore.set(key, record);
    const remaining = Math.max(0, maxReqs - record.count);
    res.setHeader('X-RateLimit-Limit', String(maxReqs));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((record.start + windowMs) / 1000)));

    if (record.count > maxReqs) {
      rateLimitLogger.warn('rate_limit.exceeded', {
        clientIp: ip,
        path: req.originalUrl || req.path,
        bucket: options.bucket || req.baseUrl || '',
        maxReqs,
        windowMs,
      });
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((record.start + windowMs - now) / 1000))));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

export const publicRateLimit = makeRateLimit(120, 60_000);
export const writeRateLimit = makeRateLimit(40, 5 * 60_000, 'Too many write requests — slow down');
export const aiRateLimit = makeRateLimit(12, 5 * 60_000, 'AI request limit reached — try again shortly', { bucket: 'ai' });
export const authRateLimit = makeRateLimit(10, 15 * 60_000, 'Too many attempts — wait 15 minutes', { bucket: 'auth' });
export const rateLimit = publicRateLimit;

const cleanupHandle = setInterval(() => {
  const cutoff = Date.now() - 60 * 60_000;
  for (const [key, value] of rateLimitStore) {
    if (value.start < cutoff) rateLimitStore.delete(key);
  }
}, 10 * 60_000);

cleanupHandle.unref?.();

export function resetRateLimitStore() {
  rateLimitStore.clear();
}
