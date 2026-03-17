import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson, signUpAndGetToken, startTestServer, stopTestServer } from './helpers/app.js';

async function bootstrapAdmin(baseUrl, username) {
  const promoted = await requestJson(baseUrl, '/api/tipping/admin/set-role', {
    method: 'POST',
    body: {
      username,
      role: 'admin',
      adminSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
    },
  });
  assert.equal(promoted.response.status, 200);
}

test('admin can create an active tipping round and members can submit tips before lockout', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const admin = await signUpAndGetToken(baseUrl, 'tipping-admin');
  const member = await signUpAndGetToken(baseUrl, 'tipping-member');
  await bootstrapAdmin(baseUrl, admin.username);

  const round = await requestJson(baseUrl, '/api/tipping/admin/round', {
    method: 'POST',
    token: admin.token,
    body: {
      round: 'Round 1',
      sport: 'NRL',
      lockout: new Date(Date.now() + 60 * 60_000).toISOString(),
      fixtures: [
        { id: 'fix-1', home: 'Broncos', away: 'Storm', venue: 'Suncorp' },
        { id: 'fix-2', home: 'Panthers', away: 'Roosters', venue: 'Penrith' },
      ],
    },
  });
  assert.equal(round.response.status, 200);

  const fixtures = await requestJson(baseUrl, '/api/tipping/fixtures');
  assert.equal(fixtures.response.status, 200);
  assert.equal(fixtures.payload?.round, 'Round 1');
  assert.equal(fixtures.payload?.fixtures?.length, 2);

  const submit = await requestJson(baseUrl, '/api/tipping/submit', {
    method: 'POST',
    token: member.token,
    body: {
      tips: {
        'fix-1': { tip: 'Broncos', margin: 8, confidence: 7, banker: true },
      },
    },
  });
  assert.equal(submit.response.status, 200);
  assert.equal(submit.payload?.tipsCount, 1);

  const myTips = await requestJson(baseUrl, '/api/tipping/my-tips', {
    token: member.token,
  });
  assert.equal(myTips.response.status, 200);
  assert.equal(myTips.payload?.round, 'Round 1');
  assert.equal(myTips.payload?.tips?.['fix-1']?.tip, 'Broncos');
});

test('comp creation and membership rules prevent duplicate joins', async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(async () => stopTestServer(server));

  const creator = await signUpAndGetToken(baseUrl, 'comp-creator');
  const member = await signUpAndGetToken(baseUrl, 'comp-member');

  const createComp = await requestJson(baseUrl, '/api/tipping/comps/create', {
    method: 'POST',
    token: creator.token,
    body: { name: 'High Rollers', sport: 'NRL' },
  });
  assert.equal(createComp.response.status, 200);
  assert.ok(createComp.payload?.code);

  const firstJoin = await requestJson(baseUrl, '/api/tipping/comps/join', {
    method: 'POST',
    token: member.token,
    body: { code: createComp.payload.code },
  });
  assert.equal(firstJoin.response.status, 200);
  assert.equal(firstJoin.payload?.comp?.members, 2);

  const duplicateJoin = await requestJson(baseUrl, '/api/tipping/comps/join', {
    method: 'POST',
    token: member.token,
    body: { code: createComp.payload.code },
  });
  assert.equal(duplicateJoin.response.status, 400);
  assert.match(duplicateJoin.payload?.error || '', /already in this comp/i);
});
