# Operations

## Logging

EdgeIQ now emits structured JSON logs to stdout/stderr, which works cleanly on Render and Railway.

Key fields included in most log lines:

- `ts`
- `level`
- `service`
- `msg`
- `requestId` when the event is tied to a request
- `path`, `method`, `statusCode`, and `durationMs` for request logs
- `component` and `provider` for service-specific logs

Sensitive values are intentionally excluded:

- no PINs
- no session tokens
- no secrets
- no raw request bodies
- usernames are masked when auth failures are logged

## Request logging

API requests are logged with duration and status.

- healthy `/api/health*` probes are skipped to reduce noise
- 4xx responses are warnings
- 5xx responses are errors
- slow requests are elevated even if they succeed

Every request receives an `X-Request-Id` response header. Pass that ID through support/debugging workflows when investigating production issues.

## Health endpoints

- `GET /api/health`
  Returns the overall status, uptime, version, storage mode, and dependency configuration summary.
- `GET /api/health/live`
  Lightweight liveness probe for the process itself.
- `GET /api/health/ready`
  Readiness probe that checks whether the app can serve traffic and whether storage is ready.

Recommended hosting setup:

- liveness probe: `/api/health/live`
- readiness probe: `/api/health/ready`

## External dependency visibility

The app now logs:

- odds API cache hits/misses, fetch success, fallback, and persist failures
- racing API live fetches, cooldown/rate-limit behavior, and generated fallback use
- AI analysis upstream failures, truncation recovery, cache restores, and cache persistence failures
- weather fetch failures and cache hits

## Useful log events

- `startup.server_listening`
- `startup.cache_restore`
- `config.validated`
- `request.completed`
- `request.unhandled_error`
- `request.service_error`
- `rate_limit.exceeded`
- `auth.signin.failed`
- `auth.lockout.triggered`
- `odds.fetch.failed`
- `racing.rate_limited`
- `analysis.upstream.error`

## Runtime knobs

- `LOG_LEVEL`
  Defaults to `info`. Use `debug` temporarily when diagnosing cache behavior or upstream API issues.
- `APP_VERSION`
  Optional explicit version string for deploy visibility in logs and health responses.

## Local verification

Run the app:

```bash
npm start
```

Check the operational endpoints:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/live
curl http://localhost:5000/api/health/ready
```

## Notes

- This is intentionally lightweight observability: stdout JSON logs plus better health responses.
- If you later add hosted monitoring, the current structured logs are a clean base for Datadog, Logtail, Better Stack, or OpenTelemetry collectors.
