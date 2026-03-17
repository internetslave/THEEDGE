import { authenticateSessionToken } from '../services/auth-service.js';

function getSessionToken(req) {
  const direct = req.headers['x-session-token'];
  if (direct) return direct;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    return authHeader;
  }

  return '';
}

export async function authMiddleware(req, res, next) {
  try {
    const auth = await authenticateSessionToken(getSessionToken(req));
    if (!auth?.username) return res.status(401).json({ error: 'Not authenticated' });
    req.username = auth.username;
    req.user = auth.user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthMiddleware(req, res, next) {
  try {
    const auth = await authenticateSessionToken(getSessionToken(req));
    if (auth?.username) {
      req.username = auth.username;
      req.user = auth.user;
    }
    next();
  } catch (error) {
    next(error);
  }
}
