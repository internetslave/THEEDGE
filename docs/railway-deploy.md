# Deploying EdgeIQ on Railway

This repo is now configured to deploy more cleanly on Railway.

## What changed

- [railway.json](/Users/jayden/Downloads/Node-Express-Starter/railway.json) overrides Railway deploy settings from code.
- The Railway pre-deploy step is intentionally a no-op so the app does not fail before boot when database wiring is incomplete.
- The app now defaults to `memory` storage unless `EDGEIQ_STORAGE_MODE=postgres` is explicitly set or `DATABASE_URL` is present.

## Fastest working setup

For a quick first deploy, set:

- `NODE_ENV=production`
- `SESSION_SECRET=...`
- `ADMIN_BOOTSTRAP_SECRET=...`

The app will boot in memory mode if no database variables are attached yet.

## Recommended production setup

Add a PostgreSQL service and then set:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `EDGEIQ_STORAGE_MODE=postgres`
- `DATABASE_SSL=false`

Then run:

```bash
npm run db:migrate
```

You can run migrations either:

- manually from a Railway shell/one-off command, or
- later by changing the service pre-deploy command in Railway if you want migrations on every deploy.

## Why this is safer for first launch

- A missing database variable no longer causes an immediate boot failure.
- A failing migration no longer blocks the entire deployment before the app has a chance to start.
- Health checks now target `/api/health/ready`.
