import express from 'express';
import { ALLOWED_ORIGINS } from '../config/constants.js';
import { env } from '../config/env.js';

export function applyCoreMiddleware(app, publicDir) {
  app.disable('x-powered-by');
  if (env.TRUST_PROXY !== false) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "base-uri 'self'; " +
      "object-src 'none'; " +
      "frame-ancestors 'self'; " +
      "form-action 'self'; " +
      "script-src 'self' 'unsafe-inline' https://replit.com https://*.replit.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com data:; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.anthropic.com https://api.the-odds-api.com https://api.open-meteo.com;"
    );
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowDevOrigins = env.NODE_ENV !== 'production';
    const isAllowed = !origin
      || ALLOWED_ORIGINS.has(origin)
      || (allowDevOrigins && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin))
      || (allowDevOrigins && origin.endsWith('.trycloudflare.com'))
      || (allowDevOrigins && origin.endsWith('.replit.app'))
      || (allowDevOrigins && origin.endsWith('.repl.co'));

    if (origin && !isAllowed && req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    if (isAllowed) {
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-token, Authorization, X-Request-Id');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: '10kb' }));
  app.use((req, res, next) => {
    req.clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
  app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));
}
