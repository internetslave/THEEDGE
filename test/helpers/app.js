import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.EDGEIQ_STORAGE_MODE = 'memory';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'abcdefghijklmnopqrstuvwxyz123456';
process.env.ADMIN_BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || 'bootstrap-secret-abcdefghijklmnopqrstuvwxyz';
process.env.PORT = '0';

const [{ createApp }, { closeRepository }, { resetRateLimitStore }, { resetOddsServiceState }] = await Promise.all([
  import('../../src/app.js'),
  import('../../src/lib/repository/index.js'),
  import('../../src/middleware/rate-limit.js'),
  import('../../src/services/odds-service.js'),
]);

export async function startTestServer() {
  resetRateLimitStore();
  resetOddsServiceState();

  const { app } = await createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

export async function stopTestServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeRepository();
  resetRateLimitStore();
  resetOddsServiceState();
}

export async function requestJson(baseUrl, path, { method = 'GET', token, body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
}

export async function signUpAndGetToken(baseUrl, suffix, overrides = {}) {
  const safeSuffix = String(suffix || 'account')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 12) || 'account';
  const username = overrides.username || `user_${safeSuffix}_${Date.now()}`.slice(0, 20);
  const signup = await requestJson(baseUrl, '/api/auth/signup', {
    method: 'POST',
    body: {
      username,
      pin: overrides.pin || '1234',
      email: overrides.email || `${username}@example.com`,
      sport: overrides.sport || 'NRL',
    },
  });

  assert.equal(signup.response.status, 200, `Expected signup success for ${username}`);
  assert.ok(signup.payload?.token, `Expected token for ${username}`);

  return {
    username,
    token: signup.payload.token,
    payload: signup.payload,
  };
}

export function installFetchMock(handler) {
  const originalFetch = global.fetch;
  global.fetch = handler;
  return () => {
    global.fetch = originalFetch;
  };
}

export function mockJsonResponse(payload, { status = 200, headers = {} } = {}) {
  const headerMap = new Map(Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headerMap.get(String(name).toLowerCase()) ?? null;
      },
    },
    async json() {
      return payload;
    },
  };
}
