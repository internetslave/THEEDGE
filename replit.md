# EdgeIQ — Sports Intelligence Dashboard

## Overview
A sports betting intelligence dashboard that fetches live odds from The Odds API and displays them with AI-powered analysis, bet tracking, and leaderboards.

## Structure
- `server.js` — Express v4 backend with odds fetching, caching (5min TTL), and normalization
- `package.json` — Minimal dependencies (express only)
- `public/index.html` — Full single-page dashboard frontend (login, odds, tips, bet log, leaderboard, analysis)

## Environment Variables
- `ODDS_API_KEY` — API key for The Odds API (required for live odds)
- `PORT` — Server port (defaults to 5000)

## Sports Covered
AFL, NRL, Soccer (A-League & EPL), UFC, Boxing

## Key Features
- Live odds with 5-minute cache
- Value bet detection
- AI confidence scoring
- Bet logging with P&L tracking
- Multi-user leaderboard (localStorage-based auth)
- AI match analysis modal
