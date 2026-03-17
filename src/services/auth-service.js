import crypto from 'crypto';
import { AVATARS, COLORS, PIN_LOCKOUT_MS, PIN_MAX_ATTEMPTS, SESSION_TTL, VALID_SPORTS } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger, maskUsername } from '../lib/logger.js';
import { getRepository } from '../lib/repository/index.js';
import { ServiceError } from '../utils/service-error.js';
import { normalizeEmail, normalizeUsername } from '../utils/normalization.js';
import { sanitizeEmail } from '../utils/validation.js';

const pinFailStore = new Map();
const authLogger = logger.child({ component: 'auth-service' });

export function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex');
}

export function genSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function signSessionPayload(payload) {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getAttemptKey(username, clientIp = 'unknown') {
  return `${normalizeUsername(username)}:${String(clientIp || 'unknown')}`;
}

export function createSession(username, sessionVersion = 1) {
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: now + SESSION_TTL,
    iat: now,
    ver: Number(sessionVersion) || 1,
  })).toString('base64url');
  const sig = signSessionPayload(payload);
  return `${payload}.${sig}`;
}

function parseSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const raw = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;

  const b64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  try {
    const expected = signSessionPayload(b64);
    if (!safeCompare(sig, expected)) return null;

    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload?.sub || !Number.isFinite(payload.exp) || Date.now() > payload.exp) return null;
    if (!Number.isFinite(payload.ver) || payload.ver < 1) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionUser(token) {
  return parseSessionToken(token)?.sub || null;
}

export async function authenticateSessionToken(token) {
  const payload = parseSessionToken(token);
  if (!payload) return null;

  const user = await getRepository().getUserByUsername(payload.sub);
  if (!user) return null;
  if ((Number(user.sessionVersion) || 1) !== payload.ver) return null;

  return { username: user.username, user, session: payload };
}

function checkPinLockout(username, clientIp) {
  const record = pinFailStore.get(getAttemptKey(username, clientIp));
  if (!record) return null;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const secondsLeft = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    const minutes = Math.ceil(secondsLeft / 60);
    return `Account locked — too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
  }
  return null;
}

function recordPinFail(username, clientIp) {
  const key = getAttemptKey(username, clientIp);
  const record = pinFailStore.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= PIN_MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
    authLogger.warn('auth.lockout.triggered', {
      usernameHint: maskUsername(username),
      clientIp: clientIp || 'unknown',
      failedAttempts: record.count,
      lockoutMs: PIN_LOCKOUT_MS,
    });
  }
  pinFailStore.set(key, record);
}

function clearPinFail(username, clientIp) {
  pinFailStore.delete(getAttemptKey(username, clientIp));
}

const pinCleanupHandle = setInterval(() => {
  const cutoff = Date.now() - PIN_LOCKOUT_MS * 2;
  for (const [key, value] of pinFailStore) {
    if ((value.lockedUntil || 0) < cutoff && value.count < PIN_MAX_ATTEMPTS) {
      pinFailStore.delete(key);
    }
  }
}, 60 * 60_000);

pinCleanupHandle.unref?.();

export async function signUpUser({ username, pin, sport, email }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = sanitizeEmail(email);
  const repository = getRepository();

  if (!normalizedUsername || !pin) throw new ServiceError(400, 'Username and PIN required');
  if (normalizedUsername.length < 2 || normalizedUsername.length > 20) throw new ServiceError(400, 'Username must be 2-20 characters');
  if (!/^[a-z0-9_]+$/.test(normalizedUsername)) throw new ServiceError(400, 'Letters, numbers and underscores only');
  if (!/^\d{4}$/.test(String(pin))) throw new ServiceError(400, 'PIN must be exactly 4 digits');
  if (email && !normalizedEmail) throw new ServiceError(400, 'Please enter a valid recovery email');

  const existingUser = await repository.getUserByUsername(normalizedUsername);
  if (existingUser) throw new ServiceError(409, 'Username already taken');

  const salt = genSalt();
  const pinHash = hashPin(String(pin), salt);
  const userCount = await repository.countUsers();
  const index = userCount % AVATARS.length;

  const createdUser = await repository.createUser({
    username: normalizedUsername,
    pinHash,
    salt,
    sport: VALID_SPORTS.has(sport) ? sport : 'AFL',
    avatar: AVATARS[index],
    color: COLORS[index],
    email: normalizedEmail.substring(0, 200),
    role: null,
    sessionVersion: 1,
    createdAt: Date.now(),
  });
  await repository.replaceUserBets(normalizedUsername, []);

  const profile = {
    username: normalizedUsername,
    avatar: createdUser.avatar,
    color: createdUser.color,
    sport: createdUser.sport,
  };

  authLogger.info('auth.signup.success', {
    usernameHint: maskUsername(normalizedUsername),
    sport: profile.sport,
    hasRecoveryEmail: !!normalizedEmail,
  });

  return { success: true, token: createSession(normalizedUsername, createdUser.sessionVersion), profile };
}

export async function signInUser({ username, pin, clientIp }) {
  const normalizedUsername = normalizeUsername(username);
  const repository = getRepository();
  if (!normalizedUsername || !pin) throw new ServiceError(400, 'Username and PIN required');
  if (normalizedUsername.length > 20) throw new ServiceError(400, 'Invalid credentials');

  const lockMessage = checkPinLockout(normalizedUsername, clientIp);
  if (lockMessage) throw new ServiceError(429, lockMessage);

  const user = await repository.getUserByUsername(normalizedUsername);
  const dummySalt = 'ffffffffffffffffffffffffffffffff';
  const provided = hashPin(String(pin).substring(0, 10), user ? user.salt : dummySalt);

  if (!user || !safeCompare(provided, user.pinHash)) {
    recordPinFail(normalizedUsername, clientIp);
    authLogger.warn('auth.signin.failed', {
      usernameHint: maskUsername(normalizedUsername),
      clientIp: clientIp || 'unknown',
      reason: user ? 'invalid_pin' : 'unknown_user',
    });
    throw new ServiceError(401, 'Invalid username or PIN');
  }

  clearPinFail(normalizedUsername, clientIp);
  authLogger.info('auth.signin.success', {
    usernameHint: maskUsername(normalizedUsername),
    clientIp: clientIp || 'unknown',
  });
  return {
    success: true,
    token: createSession(normalizedUsername, user.sessionVersion),
    profile: {
      username: normalizedUsername,
      avatar: user.avatar,
      color: user.color,
      sport: user.sport,
    },
  };
}

export async function resetPin({ username, email }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = sanitizeEmail(email);
  const repository = getRepository();

  if (!normalizedUsername || !normalizedEmail) throw new ServiceError(400, 'Username and email required');
  if (normalizedUsername.length > 20) throw new ServiceError(400, 'Request could not be processed');

  const user = await repository.getUserByUsername(normalizedUsername);
  if (!user || !user.email || normalizeEmail(user.email) !== normalizedEmail) {
    authLogger.warn('auth.recovery.request', {
      usernameHint: maskUsername(normalizedUsername),
      emailMatched: false,
    });
    return { success: true, message: 'If that account exists, a recovery request has been received.' };
  }

  authLogger.info('auth.recovery.request', {
    usernameHint: maskUsername(normalizedUsername),
    emailMatched: true,
  });
  return {
    success: true,
    message: 'If that account exists, a recovery request has been received. Self-service PIN resets are disabled in this build.',
  };
}

export async function signOutUser(username) {
  await getRepository().bumpUserSessionVersion(username);
  authLogger.info('auth.signout.success', {
    usernameHint: maskUsername(username),
  });
  return { success: true };
}

export async function getProfile(username) {
  const user = await getRepository().getUserByUsername(username);
  if (!user) throw new ServiceError(404, 'User not found');

  return {
    username,
    avatar: user.avatar,
    color: user.color,
    sport: user.sport,
  };
}
