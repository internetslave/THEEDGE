# EdgeIQ Backend Refactor Migration Note

The Express backend has been moved from a single root `server.js` file into a modular `src/` structure with a repository-backed persistence layer:

- `src/app.js` creates the Express app, initializes the active repository, restores warm caches, and wires middleware/routes.
- `src/server.js` is the runtime bootstrap and the new primary entrypoint.
- `src/routes/` contains the public HTTP surface and preserves the existing route URLs.
- `src/controllers/` translates HTTP requests into service calls and keeps response shapes stable.
- `src/services/` contains domain logic for auth, bets, leaderboard, tipping/comps, odds, racing, AI analysis, fantasy, and weather.
- `src/middleware/` holds auth, rate limiting, security headers, request parsing, and error handling.
- `src/lib/repository/` holds the storage abstraction plus the PostgreSQL and in-memory implementations.
- `db/migrations/` contains schema setup for PostgreSQL.
- `src/scripts/db-migrate.js` applies migrations.
- `src/scripts/import-jsonbin.js` imports the legacy JSONBin snapshot into PostgreSQL.
- `src/config/` centralizes environment/config and filesystem paths.
- `src/utils/` contains shared helpers for HTTP, controller errors, sleep, and cache headers.

Compatibility notes:

- Existing route URLs are unchanged.
- A root `server.js` compatibility shim remains so older start commands still work.
- `package.json` now points to `src/server.js` as the main bootstrap path.
- Production persistence now targets PostgreSQL through the repository abstraction.
- Development can still run in `memory` mode when `DATABASE_URL` is not configured.

Repository / database notes:

1. Run `npm run db:migrate` against the target PostgreSQL instance before switching production traffic.
2. If you have legacy JSONBin data, run `npm run db:import-jsonbin` after setting both the PostgreSQL and JSONBin env vars.
3. Keep `EDGEIQ_STORAGE_MODE=postgres` for production and only use `memory` mode locally.
