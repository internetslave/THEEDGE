import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson, startTestServer, stopTestServer } from './helpers/app.js';

test('auth routes enforce rate limiting with useful headers', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  let limitedResponse = null;
  for (let attempt = 1; attempt <= 11; attempt += 1) {
    const result = await requestJson(baseUrl, '/api/auth/signup', {
      method: 'POST',
      body: {},
    });

    if (attempt <= 10) {
      assert.equal(result.response.status, 400);
    } else {
      limitedResponse = result.response;
      assert.equal(result.response.status, 429);
      assert.equal(result.payload?.error, 'Too many attempts — wait 15 minutes');
    }
  }

  assert.ok(limitedResponse);
  assert.equal(limitedResponse.headers.get('x-ratelimit-limit'), '10');
  assert.ok(Number(limitedResponse.headers.get('x-ratelimit-reset')) > 0);
  assert.ok(Number(limitedResponse.headers.get('retry-after')) >= 1);
});
