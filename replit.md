# EdgeIQ — Sports Intelligence Dashboard

## Overview
A sports betting intelligence dashboard at edgebets.net that fetches live odds from The Odds API and displays them with AI-powered analysis, bet tracking, leaderboards, and a tipping competition system.

## Structure
- `server.js` — Express v4 backend: odds fetching (15-min cache), AI analysis proxy (Anthropic), user auth (JSONBin.io), racing data (The Racing API + fallback generator), tipping/comps system, fantasy AI proxy
- `package.json` — Dependencies: express (v4). ESM module (`"type": "module"`)
- `public/index.html` — Main dashboard: login, odds, AI tips, bet log, leaderboard, analytics, match modals with racing support
- `public/fantasy.html` — FieldIQ Fantasy Sports Advisor (AI-powered via server proxy)
- `public/tipping.html` — The Tip: tipping competition with comps, leaderboards, scoring

## Environment Variables
- `ODDS_API_KEY` — API key for The Odds API (required for live odds)
- `ANTHROPIC_API_KEY` — Anthropic API key for AI analysis
- `JSONBIN_API_KEY` — JSONBin.io API key for data persistence
- `JSONBIN_BIN_ID` — JSONBin.io bin ID for user/bet/tipping data
- `SESSION_SECRET` — Session signing secret
- `ADMIN_SECRET` — Admin endpoint authentication secret
- `RACING_API_USER` — The Racing API username (theracingapi.com, free plan + AU regional add-on)
- `RACING_API_PASS` — The Racing API password
- `PORT` — Server port (defaults to 5000)

## Sports Covered
AFL, NRL, Soccer (A-League & EPL), UFC, Boxing, Greyhound Racing, Horse Racing

## Key Features
- Live odds with 15-minute cache + combined cache layer
- Real horse racing data via The Racing API (theracingapi.com) with 15-min cache
  - Fetches AU meets for today+tomorrow, real runners with jockey/trainer/form/odds
  - Falls back to seeded-RNG generated data if API credentials not configured
  - Greyhound data always uses fallback generator (Racing API has no greyhound coverage)
- AI match analysis (Claude Haiku, 3hr TTL, top 10 soonest matches queued)
- Value bet detection
- Bet logging with P&L tracking
- Multi-user auth with JSONBin.io persistence
- Leaderboard system
- Tipping competition with comps, invite codes, round management
- Fantasy AI advisor (proxied through server, not direct browser calls)
- Mobile-optimized share button (native share + clipboard fallback)
- Sport filter system with SPORT_FILTER_MAP + matchesSportFilter()

## Architecture Notes
- Express v4 (v5 breaks wildcard routes)
- ESM modules throughout
- Sessions are in-memory (users get logged out on server restart)
- Port 5000 bound to 0.0.0.0
- Racing API: HTTP Basic auth, endpoints `/v1/australia/meets?date=YYYY-MM-DD` and `/v1/australia/meets/{id}/races`
- Racing data cached 15 min; greyhound fallback uses seeded RNG (changes every 6 hours)
- AI analysis not run on racing events (only team sports)
