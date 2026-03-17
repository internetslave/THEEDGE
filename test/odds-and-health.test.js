import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_SPORTS } from '../src/config/constants.js';
import { mockJsonResponse, requestJson, startTestServer, stopTestServer } from './helpers/app.js';

test('health-critical routes respond with stable shapes', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const health = await requestJson(baseUrl, '/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.payload?.status, 'ok');
  assert.match(health.payload?.time || '', /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(typeof health.payload?.uptimeSec, 'number');
  assert.equal(typeof health.payload?.storage?.ready, 'boolean');

  const usage = await requestJson(baseUrl, '/api/odds/usage');
  assert.equal(usage.response.status, 200);
  assert.equal(usage.payload?.hasCachedData, false);
  assert.equal(typeof usage.payload?.nextRefresh, 'number');

  const live = await requestJson(baseUrl, '/api/health/live');
  assert.equal(live.response.status, 200);
  assert.equal(live.payload?.status, 'alive');

  const ready = await requestJson(baseUrl, '/api/health/ready');
  assert.equal(ready.response.status, 200);
  assert.equal(ready.payload?.status, 'ready');
});

test('odds responses reuse the in-memory cache instead of refetching immediately', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const originalFetch = global.fetch;
  let oddsFetchCount = 0;
  global.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith(baseUrl)) {
      return originalFetch(input, init);
    }

    if (url.includes('/sports/') && url.includes('/odds/')) {
      oddsFetchCount += 1;
      return mockJsonResponse([
        {
          id: `event-${oddsFetchCount}`,
          home_team: 'Broncos',
          away_team: 'Storm',
          commence_time: '2026-03-17T10:00:00Z',
          bookmakers: [
            {
              markets: [
                {
                  key: 'h2h',
                  outcomes: [
                    { name: 'Broncos', price: 2.1 },
                    { name: 'Storm', price: 1.8 },
                  ],
                },
              ],
            },
          ],
        },
      ], {
        headers: {
          'x-requests-remaining': '499',
          'x-requests-used': String(oddsFetchCount),
        },
      });
    }

    throw new Error(`Unexpected fetch in odds cache test: ${url}`);
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const first = await requestJson(baseUrl, '/api/odds');
  assert.equal(first.response.status, 200);
  assert.equal(first.payload?.success, true);
  assert.ok(first.payload?.events?.length >= ALL_SPORTS.length);

  const callsAfterFirstRequest = oddsFetchCount;
  assert.equal(callsAfterFirstRequest, ALL_SPORTS.length);

  const second = await requestJson(baseUrl, '/api/odds');
  assert.equal(second.response.status, 200);
  assert.equal(second.payload?.success, true);
  assert.equal(oddsFetchCount, callsAfterFirstRequest);

  const usage = await requestJson(baseUrl, '/api/odds/usage');
  assert.equal(usage.response.status, 200);
  assert.equal(usage.payload?.hasCachedData, true);
});
