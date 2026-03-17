import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson, signUpAndGetToken, startTestServer, stopTestServer } from './helpers/app.js';

test('bet creation validates payload shape and persists sanitized bets', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const account = await signUpAndGetToken(baseUrl, 'bets');

  const invalid = await requestJson(baseUrl, '/api/bets', {
    method: 'POST',
    token: account.token,
    body: { bets: 'not-an-array' },
  });
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.payload?.error || '', /bets must be an array/i);

  const saved = await requestJson(baseUrl, '/api/bets', {
    method: 'POST',
    token: account.token,
    body: {
      bets: [
        {
          id: 'bet-1',
          event: 'Broncos vs Storm',
          bet: 'Broncos',
          sport: 'NRL',
          stake: -25,
          odds: 0.5,
          result: 'win',
          notes: 'Line value looked strong',
        },
      ],
    },
  });
  assert.equal(saved.response.status, 200);

  const bets = await requestJson(baseUrl, '/api/bets', {
    token: account.token,
  });
  assert.equal(bets.response.status, 200);
  assert.equal(bets.payload?.bets?.length, 1);
  assert.equal(bets.payload.bets[0].match, 'Broncos vs Storm');
  assert.equal(bets.payload.bets[0].team, 'Broncos');
  assert.equal(bets.payload.bets[0].stake, 0);
  assert.equal(bets.payload.bets[0].odds, 1);
  assert.equal(bets.payload.bets[0].result, 'win');
});

test('leaderboard aggregates settled bets into win rate and ROI correctly', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const alpha = await signUpAndGetToken(baseUrl, 'leader-alpha', { sport: 'NRL' });
  const beta = await signUpAndGetToken(baseUrl, 'leader-beta', { sport: 'AFL' });

  await requestJson(baseUrl, '/api/bets', {
    method: 'POST',
    token: alpha.token,
    body: {
      bets: [
        { id: 'a1', match: 'Broncos vs Storm', team: 'Broncos', sport: 'NRL', stake: 10, odds: 2.2, result: 'win' },
        { id: 'a2', match: 'Panthers vs Roosters', team: 'Panthers', sport: 'NRL', stake: 10, odds: 1.8, result: 'loss' },
      ],
    },
  });

  await requestJson(baseUrl, '/api/bets', {
    method: 'POST',
    token: beta.token,
    body: {
      bets: [
        { id: 'b1', match: 'Lions vs Swans', team: 'Swans', sport: 'AFL', stake: 20, odds: 3.0, result: 'win' },
      ],
    },
  });

  const leaderboard = await requestJson(baseUrl, '/api/leaderboard');
  assert.equal(leaderboard.response.status, 200);
  assert.equal(leaderboard.payload?.success, true);

  const alphaEntry = leaderboard.payload.entries.find((entry) => entry.username === alpha.username);
  const betaEntry = leaderboard.payload.entries.find((entry) => entry.username === beta.username);

  assert.equal(alphaEntry.settled, 2);
  assert.equal(alphaEntry.wins, 1);
  assert.equal(alphaEntry.winRate, 50);
  assert.equal(alphaEntry.roi, 10);

  assert.equal(betaEntry.settled, 1);
  assert.equal(betaEntry.wins, 1);
  assert.equal(betaEntry.winRate, 100);
  assert.equal(betaEntry.roi, 200);
});
