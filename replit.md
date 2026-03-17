# EdgeIQ — Sports Intelligence Dashboard

## Overview
A sports betting intelligence dashboard at edgebets.net that fetches live odds from The Odds API and displays them with AI-powered analysis, bet tracking, leaderboards, and a tipping competition system.

## Structure
- `src/server.js` — Bootstrap entrypoint: validates env, creates the app, restores warm caches, starts the HTTP server
- `src/app.js` — Express app factory: middleware, route registration, API/page split, error handling
- `src/routes/` — Route modules preserving the existing `/api/*`, `/fantasy`, `/tipping`, and catch-all URLs
- `src/controllers/` — HTTP-facing handlers that keep response shapes stable
- `src/services/` — Domain logic for auth, odds, racing, AI analysis, bets, leaderboard, tipping/comps, fantasy, and weather
- `src/lib/repository/` — Repository abstraction plus PostgreSQL and in-memory implementations
- `db/migrations/` — PostgreSQL schema migrations
- `src/scripts/` — Database migration runner and JSONBin import utility
- `server.js` — compatibility shim for the new modular bootstrap
- `package.json` — Dependencies: express (v4). ESM module (`"type": "module"`)
- `public/index.html` — Main dashboard: login, odds, AI tips, bet log, leaderboard, analytics, match modals with racing support
- `public/fantasy.html` — FieldIQ Fantasy Sports Advisor (AI-powered via server proxy)
- `public/tipping.html` — The Tip: tipping competition with comps, leaderboards, scoring

## Environment Variables
- `EDGEIQ_STORAGE_MODE` — `postgres` in production, `memory` for local fallback
- `DATABASE_URL` — PostgreSQL connection string
- `DATABASE_SSL` — `true`/`false` SSL toggle for PostgreSQL connections
- `ODDS_API_KEY` — API key for The Odds API (required for live odds)
- `ANTHROPIC_API_KEY` — Anthropic API key for AI analysis
- `JSONBIN_API_KEY` — JSONBin.io API key for one-time migration import from the old store
- `JSONBIN_BIN_ID` — JSONBin.io bin ID for one-time migration import from the old store
- `SESSION_SECRET` — Session signing secret
- `ADMIN_SECRET` — Admin endpoint authentication secret
- `RACING_API_USER` — The Racing API username (theracingapi.com, free plan + AU regional add-on)
- `RACING_API_PASS` — The Racing API password
- `PORT` — Server port (defaults to 5000)

## Sports Covered
AFL, NRL, NBA, Soccer (A-League & EPL), UFC, Boxing, Greyhound Racing, Horse Racing

## Auth Security
- Sessions: HMAC-signed, **7-day TTL** (username:expiry:sig). Stateless — no server session store.
- IP rate limiting: 10 auth attempts per 15 min per IP (all auth routes)
- **Per-username PIN lockout**: 5 wrong PINs → 10-minute cooldown (real accounts only, prevents enumeration)
- Token expiry validated server-side on every authenticated request

## Key Features
- Live odds with 6-hour cache persisted through the repository layer so warm sport caches can survive restarts
- Per-sport regional bookmaker config: AU for local sports, AU+US for NBA/UFC/Boxing, AU+UK for EPL
- **`/api/rosters`** — server-managed player pools (AFL_FWDS, AFL_MIDS, NRL_BACKS, NRL_HALVES, NBA_POOL); update ROSTERS constant in server.js, no frontend redeploy needed
- Real horse racing data via The Racing API (theracingapi.com) with 15-min cache
  - Fetches AU meets for today+tomorrow, real runners with jockey/trainer/form/odds
  - Falls back to seeded-RNG generated data if API credentials not configured
  - Greyhound data always uses fallback generator (Racing API has no greyhound coverage)
- AI match analysis (Claude Haiku, 3hr TTL, top 10 soonest matches queued)
  - Sport-specific context injected into every prompt (NBA pace/rest/stars, AFL clearances, etc.)
- Value bet detection
- Bet logging with P&L tracking
- Multi-user auth with PostgreSQL-backed persistence
- Leaderboard system
- Tipping competition with comps, invite codes, round management
- Fantasy AI advisor (proxied through server, not direct browser calls)
- Mobile-optimized share button (native share + clipboard fallback)
- Sport filter system with SPORT_FILTER_MAP + matchesSportFilter()
- Full mobile layout: bottom nav (5 items), User Sheet, More Sheet, bet cards view

## Security Hardening (applied March 2026)
- Auth brute-force protection: 10 attempts per 15 min per IP via `authRateLimit`
- Rate limiter is per IP+endpoint, with automatic Map pruning every 10 min
- Token accepted only from `x-session-token` header — never from URL query params
- Constant-time PIN hash comparison prevents timing-based username enumeration
- Generic error message "Invalid username or PIN" prevents enumeration
- Leaderboard returns aggregate stats only (no raw bet data for other users)
- `/api/db-test` removed; `/api/health` returns minimal ping only
- Bets POST validates all fields (clamped ranges, max 500 bets, sanitized strings)
- Fantasy AI has system prompt guard restricting to sports topics only
- Comp join validates 6-char hex code with regex; caps members at 200
- Security headers: HSTS, Permissions-Policy, X-Content-Type-Options, Referrer-Policy, CSP
- CORS includes `edgebets.net` and `www.edgebets.net` in allowlist
- `connect-src` CSP includes `api.open-meteo.com` (weather proxy)

## Architecture Notes
- Express v4 (v5 breaks wildcard routes)
- ESM modules throughout
- Sessions are signed and stateless (not stored server-side)
- Port 5000 bound to 0.0.0.0
- Racing API: HTTP Basic auth, endpoints `/v1/australia/meets?date=YYYY-MM-DD` and `/v1/australia/meets/{id}/races`
- Racing data cached 15 min; greyhound fallback uses seeded RNG (changes every 6 hours)
- AI analysis not run on racing events (only team sports)
