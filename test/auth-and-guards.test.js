import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson, signUpAndGetToken, startTestServer, stopTestServer } from './helpers/app.js';

test('signup, me, signout, and revoked session token flow works end-to-end', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const account = await signUpAndGetToken(baseUrl, 'auth');

  const meBefore = await requestJson(baseUrl, '/api/auth/me', {
    token: account.token,
  });
  assert.equal(meBefore.response.status, 200);
  assert.equal(meBefore.payload?.username, account.username);

  const signout = await requestJson(baseUrl, '/api/auth/signout', {
    method: 'POST',
    token: account.token,
  });
  assert.equal(signout.response.status, 200);

  const meAfter = await requestJson(baseUrl, '/api/auth/me', {
    token: account.token,
  });
  assert.equal(meAfter.response.status, 401);
  assert.equal(meAfter.payload?.error, 'Not authenticated');
});

test('session guard rejects invalid tokens and reset-pin does not leak a replacement PIN', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const username = `reset_${Date.now()}`;
  const signup = await requestJson(baseUrl, '/api/auth/signup', {
    method: 'POST',
    body: { username, pin: '1234', email: 'reset@example.com', sport: 'AFL' },
  });
  assert.equal(signup.response.status, 200);

  const invalidSession = await requestJson(baseUrl, '/api/auth/me', {
    token: 'not-a-real-token',
  });
  assert.equal(invalidSession.response.status, 401);

  const reset = await requestJson(baseUrl, '/api/auth/reset-pin', {
    method: 'POST',
    body: { username, email: 'reset@example.com' },
  });
  assert.equal(reset.response.status, 200);
  assert.equal(reset.payload?.success, true);
  assert.equal(Object.hasOwn(reset.payload || {}, 'newPin'), false);
  assert.match(reset.payload?.message || '', /recovery request/i);
});

test('admin bootstrap requires the configured secret and AI route guardrails stay in place', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const account = await signUpAndGetToken(baseUrl, 'admin');

  const deniedBootstrap = await requestJson(baseUrl, '/api/tipping/admin/set-role', {
    method: 'POST',
    body: { username: account.username, role: 'admin' },
  });
  assert.equal(deniedBootstrap.response.status, 403);

  const bootstrapped = await requestJson(baseUrl, '/api/tipping/admin/set-role', {
    method: 'POST',
    body: {
      username: account.username,
      role: 'admin',
      adminSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
    },
  });
  assert.equal(bootstrapped.response.status, 200);

  const noAuthAnalyse = await requestJson(baseUrl, '/api/analyse', {
    method: 'POST',
    body: { home: 'Broncos', away: 'Storm', sport: 'NRL' },
  });
  assert.equal(noAuthAnalyse.response.status, 401);

  const invalidAnalyse = await requestJson(baseUrl, '/api/analyse', {
    method: 'POST',
    token: account.token,
    body: {},
  });
  assert.equal(invalidAnalyse.response.status, 400);
  assert.equal(invalidAnalyse.payload?.errorType, 'validation');
});
