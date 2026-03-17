# Testing

## Stack

EdgeIQ uses Node's built-in `node:test` runner.

Why this stack:

- no extra framework dependency to maintain
- fast startup for a small Express app
- easy route-level integration tests with the real app bootstrap
- straightforward mocking for external APIs by overriding `global.fetch`

## What the suite covers

The test suite focuses on the highest-risk behavior that future AI edits are most likely to break:

- auth flows and session revocation
- token guardrails and AI route access checks
- auth rate limiting
- bet validation and persistence normalization
- leaderboard aggregation logic
- tipping round creation and tip submission
- comp membership rules
- odds cache reuse
- health-critical route responses

## Running locally

Install dependencies:

```bash
npm install
```

Run the full suite:

```bash
npm test
```

Run in watch mode while editing:

```bash
npm run test:watch
```

## CI usage

This suite is designed to run without external API keys or a live database.

- tests force `NODE_ENV=test`
- persistence uses the in-memory repository
- odds API calls are mocked in the cache test
- AI tests verify guardrails without calling Anthropic

Recommended CI command:

```bash
npm ci
npm test
```

## Test structure

- [test/helpers/app.js](/Users/jayden/Downloads/Node-Express-Starter/test/helpers/app.js): shared app bootstrap, request helpers, and fetch mocking utilities
- [test/auth-and-guards.test.js](/Users/jayden/Downloads/Node-Express-Starter/test/auth-and-guards.test.js): auth, sessions, admin bootstrap, AI guardrails
- [test/rate-limit.test.js](/Users/jayden/Downloads/Node-Express-Starter/test/rate-limit.test.js): request throttling behavior
- [test/bets-and-leaderboard.test.js](/Users/jayden/Downloads/Node-Express-Starter/test/bets-and-leaderboard.test.js): bet validation and leaderboard calculations
- [test/tipping-and-comps.test.js](/Users/jayden/Downloads/Node-Express-Starter/test/tipping-and-comps.test.js): tipping rounds and comp rules
- [test/odds-and-health.test.js](/Users/jayden/Downloads/Node-Express-Starter/test/odds-and-health.test.js): health routes and odds cache behavior

## Notes

- The suite intentionally favors meaningful route-level coverage over broad shallow coverage.
- If you add a new risky business rule, extend the nearest existing test file instead of creating a huge monolithic suite.
- If a new feature depends on an external provider, mock the provider boundary and keep the route/service contract under test.
