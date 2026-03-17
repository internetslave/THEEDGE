# Deploying EdgeIQ on Render

This repo is now prepared for a straightforward Render deployment.

## What is included

- [render.yaml](/Users/jayden/Downloads/Node-Express-Starter/render.yaml) for Render Blueprint deploys
- [.env.example](/Users/jayden/Downloads/Node-Express-Starter/.env.example) with the production environment variables
- database migrations run automatically before each deploy with `npm run db:migrate`
- readiness and liveness endpoints for Render health checks

## Recommended setup

Use:

- 1 Render Web Service for the app
- 1 Render PostgreSQL database
- 1 custom domain after the first successful deploy

## Fastest deployment path

### 1. Push this repo to GitHub

Render deploys cleanly from GitHub.

### 2. In Render, create a new Blueprint

Point Render at the repo and let it read [render.yaml](/Users/jayden/Downloads/Node-Express-Starter/render.yaml).

This will create:

- the `edgeiq` web service
- the `edgeiq-db` PostgreSQL database

### 3. Fill the required secrets

After Render creates the service, add these values in the dashboard if they are blank:

- `ODDS_API_KEY`
- `ANTHROPIC_API_KEY`
- `RACING_API_USER`
- `RACING_API_PASS`

These are intentionally marked `sync: false` in the blueprint so they are not committed into the repo.

### 4. Deploy

Render will:

- install dependencies
- run `npm run db:migrate`
- start the app with `npm start`

The health check is set to:

- `/api/health/ready`

Useful runtime endpoints:

- `/api/health`
- `/api/health/live`
- `/api/health/ready`

## Custom domain

After the first deploy is healthy:

1. Open the `edgeiq` web service in Render
2. Go to the custom domain section
3. Add your domain or subdomain
4. Update your DNS at your registrar
5. Render will provision TLS automatically

Examples:

- `app.yourdomain.com`
- `edgeiq.yourdomain.com`

## One-time JSONBin import

If you want to import your old JSONBin data into Postgres:

1. Temporarily add:
   - `JSONBIN_API_KEY`
   - `JSONBIN_BIN_ID`
2. Open a Render shell or one-off job for the service
3. Run:

```bash
npm run db:import-jsonbin
```

4. Remove the JSONBin credentials after the import

## Production env notes

Important defaults in this repo:

- `EDGEIQ_STORAGE_MODE=postgres`
- `DATABASE_SSL=true`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=true`
- `TRUST_PROXY=1`
- structured JSON logs enabled by default

## Recommended first production checks

After deploy, verify:

```bash
curl https://YOUR-DOMAIN/api/health
curl https://YOUR-DOMAIN/api/health/live
curl https://YOUR-DOMAIN/api/health/ready
```

Then test:

- signup
- signin
- odds board loads
- AI analysis opens
- bet logging works
- tipping page loads

## If something fails

Check Render logs for:

- `startup.server_listening`
- `config.validated`
- `startup.cache_restore`
- `request.unhandled_error`
- `odds.fetch.failed`
- `analysis.upstream.error`

## Suggested launch order

1. Deploy on the Render default domain
2. Smoke test the app
3. Import JSONBin data if needed
4. Add your custom domain
5. Only then start sending users to it
