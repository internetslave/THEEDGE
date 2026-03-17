# EdgeIQ Agent Guide

## Product

EdgeIQ is a production-oriented sports betting intelligence dashboard focused on live odds, AI-assisted analysis, bet tracking, leaderboards, tipping competitions, and fantasy sports advice. The current product is already beyond a simple MVP: it has real authentication, live external data, user state, and multiple user-facing workflows. The goal is to evolve it into a premium, trustworthy, maintainable SaaS without losing the product behaviors that already work.

## Architecture Goals

- Production-grade reliability over quick hacks.
- Modular backend design, even though the current backend is still concentrated in `server.js`.
- Premium UX with trust-first presentation.
- Security-first handling of auth, secrets, external APIs, and user data.
- Mobile-first responsiveness across dashboard, tipping, and fantasy experiences.
- Low regression risk when changing live flows, routes, scoring, or persistence behavior.

## Actual Codebase Structure

- `server.js`
  Current Express entrypoint and primary backend runtime.
  It currently contains middleware, auth, rate limiting, odds/racing/AI integrations, caching, persistence wiring, and most API routes.
- `public/index.html`
  Main EdgeIQ dashboard shell.
- `public/fantasy.html`
  FieldIQ fantasy advisor experience.
- `public/tipping.html`
  The Tip tipping competition experience.
- `public/styles.css`
  Main shared styling for the dashboard app.
- `public/js/config.js`
  Frontend constants, sport maps, labels, bookie links, venue/weather metadata, and utility config.
- `public/js/state.js`
  Shared browser-side state.
- `public/js/data.js`
  Client-side data fetching, caching, enrichment, and odds/weather helpers.
- `public/js/render.js`
  Main dashboard rendering logic.
- `public/js/ui.js`
  User interactions, page switching, modal/form actions, and bet entry flows.
- `public/js/auth.js`
  Auth flow, session headers, server-backed bet persistence overrides, and authenticated leaderboard behavior.
- `public/js/init.js`
  Bootstrapping, roster loading, idle detection, keyboard shortcuts, and startup helpers.
- `ai-cache.json`
  Historical/local cache artifact; do not treat it as the primary production persistence layer.
- `attached_assets/`
  Reference material and exported artifacts, not core runtime code.

## Important Repo-Specific Constraints

- The app currently has no build step and no frontend framework bundler. Changes to the browser app must respect static HTML + ordered global script loading.
- `public/index.html` relies on script load order. In particular, `auth.js` intentionally overrides some globally defined behavior after other UI/render files load.
- The backend is ESM (`"type": "module"` in `package.json`).
- Static assets are served directly from `/public`.
- Current persistence is JSONBin-backed with in-memory working state restored on boot. Future work should make database migration easier, not harder.
- The main dashboard is dark and premium. `fantasy.html` and `tipping.html` have their own visual identities, so do not accidentally flatten those experiences unless doing an intentional cross-product redesign.

## Coding Rules

- Prefer small, focused modules over large files.
- Avoid breaking existing routes unless replacing them safely and preserving contract compatibility.
- Preserve current behavior unless explicitly improving it.
- Add validation for all external input.
- Use environment variables for all secrets and deployment config.
- Avoid duplicated logic across routes, pages, and frontend modules.
- Favor readable code over clever code.
- Keep route handlers thin where possible; move reusable logic toward helpers/services/middleware.
- Do not move secrets or provider calls into browser code. Sensitive integrations must remain server-side.
- When working in the frontend, preserve or deliberately refactor global dependencies instead of silently breaking shared globals.

## Workflow Rules

- Always inspect existing code paths before changing behavior.
- Propose a short plan before large edits.
- After edits, run tests or create them if absent.
- If no tests exist, add targeted tests around changed behavior.
- Summarize risks and any migration steps after significant changes.
- Treat this repo as low-regression-risk work: odds, auth, leaderboards, tipping, and user records should not change accidentally.
- For backend changes, inspect the relevant API route, downstream persistence path, and frontend consumer before modifying behavior.
- For frontend changes, inspect both the HTML entrypoint and the relevant `public/js/*.js` files before changing UI logic.

## Testing Expectations

- There is currently no mature automated test suite and `package.json` only exposes `npm start`.
- For any non-trivial behavior change, add targeted tests or at minimum lightweight verification scripts around the changed route or flow.
- Prioritize tests around:
  auth and session behavior
  API input validation
  odds/racing/AI response shaping
  leaderboard, tipping, and bet persistence logic
- If UI behavior changes materially, do a mobile and desktop smoke check.

## Product Rules

- Trust and clarity matter more than gimmicks.
- All betting-related outputs must clearly distinguish:
  live or fetched data
  model or AI-generated analysis
  user-tracked bets, results, or records
- Avoid misleading or irresponsible “guaranteed win” language.
- Preserve compliance-friendly, credibility-first copy.
- When adding AI features, make the model’s role assistive and clearly labeled, never authoritative or deceptive.

## UI Rules

- The main EdgeIQ dashboard should keep a sleek, dark, premium aesthetic.
- Maintain strong visual hierarchy across pages and cards.
- Keep spacing, typography, cards, badges, charts, and states consistent within each product surface.
- Loading, empty, and error states should feel polished, intentional, and trustworthy.
- Mobile-first responsiveness is mandatory, not optional.
- For shared EdgeIQ dashboard work, favor a premium sportsbook/intelligence aesthetic over generic admin styling.
- For `fantasy.html` and `tipping.html`, respect their existing branded direction unless the task is specifically to unify them.

## Security Rules

- Validate and sanitize all request body, query, header, and external API input.
- Never trust client-calculated values for user records, scoring, or privileged actions.
- Keep session and auth logic server-side.
- Use `process.env` for all secrets and environment-specific configuration.
- Preserve or improve existing hardening such as rate limiting, security headers, and auth protections.
- Avoid logging secrets, tokens, or sensitive user data.

## Deployment Rules

- Target Render- and Railway-friendly Node hosting.
- The app must work with `process.env.PORT`.
- Do not hardcode hostnames, ports, or platform-specific assumptions.
- Keep startup simple: `npm start` should remain viable unless intentionally upgraded.
- Support future migration from JSONBin to a real database by isolating persistence concerns instead of spreading data access logic further through the codebase.

## Recommended Refactor Direction

- Extract backend concerns from `server.js` gradually into clear modules such as:
  routes
  services
  middleware
  persistence
  adapters for external APIs
- Preserve existing route contracts during refactors unless explicitly versioning or coordinating frontend changes.
- Introduce persistence abstractions so JSONBin can be swapped for a database with minimal route churn.
- Prefer incremental migration over large rewrites.

## Done Criteria For Future Changes

- The changed behavior works in the real UI or API path that uses it.
- Existing route contracts are preserved or intentionally migrated.
- New code is understandable and does not duplicate existing logic.
- Validation and failure handling are included.
- Risks, follow-up cleanup, and migration notes are documented in the handoff.
