function parsePort(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parseTrustProxy(value) {
  if (value == null || value === '') return process.env.NODE_ENV === 'production' ? 1 : false;
  if (['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())) return 1;
  if (['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase())) return false;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : false;
}

function resolveStorageMode() {
  const requested = String(process.env.EDGEIQ_STORAGE_MODE || '').trim().toLowerCase();
  if (requested === 'postgres' || requested === 'memory') return requested;
  if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') return 'postgres';
  return 'memory';
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parsePort(process.env.PORT),
  APP_VERSION: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ODDS_API_KEY: process.env.ODDS_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  RACING_API_USER: process.env.RACING_API_USER,
  RACING_API_PASS: process.env.RACING_API_PASS,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: parseBoolean(process.env.DATABASE_SSL, process.env.NODE_ENV === 'production'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: parseBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, process.env.NODE_ENV === 'production'),
  EDGEIQ_STORAGE_MODE: resolveStorageMode(),
  JSONBIN_API_KEY: process.env.JSONBIN_API_KEY,
  JSONBIN_BIN_ID: process.env.JSONBIN_BIN_ID,
  SESSION_SECRET: process.env.SESSION_SECRET || 'edgeiq-fallback-secret-change-me',
  ADMIN_BOOTSTRAP_SECRET: process.env.ADMIN_BOOTSTRAP_SECRET || process.env.ADMIN_SECRET,
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
};

export function validateEnvironment(logger = console) {
  if (!env.ODDS_API_KEY) logger.warn?.('config.missing_optional_secret', { key: 'ODDS_API_KEY', impact: 'live_odds_unavailable' });
  if (!env.ANTHROPIC_API_KEY) logger.warn?.('config.missing_optional_secret', { key: 'ANTHROPIC_API_KEY', impact: 'ai_analysis_unavailable' });
  if (!env.RACING_API_USER || !env.RACING_API_PASS) {
    logger.warn?.('config.missing_optional_secret', {
      key: 'RACING_API_USER/RACING_API_PASS',
      impact: 'generated_racing_fallback_only',
    });
  }
  if (env.EDGEIQ_STORAGE_MODE === 'postgres' && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when EDGEIQ_STORAGE_MODE=postgres');
  }
  if (env.EDGEIQ_STORAGE_MODE === 'memory') {
    logger.warn?.('config.degraded_storage_mode', {
      storageMode: 'memory',
      impact: 'non_persistent_runtime_state',
    });
  }
  if (!env.SESSION_SECRET || env.SESSION_SECRET === 'edgeiq-fallback-secret-change-me') {
    if (env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production');
    }
    logger.warn?.('config.weak_session_secret', {
      reason: 'compatibility_fallback',
      nodeEnv: env.NODE_ENV,
    });
  }
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be at least 32 characters in production');
    }
    logger.warn?.('config.short_secret', {
      key: 'SESSION_SECRET',
      minLength: 32,
      nodeEnv: env.NODE_ENV,
    });
  }
  if (env.EDGEIQ_STORAGE_MODE === 'postgres' && env.NODE_ENV === 'production' && !env.DATABASE_SSL) {
    logger.warn?.('config.database_ssl_disabled', { nodeEnv: env.NODE_ENV });
  }
  if (env.DATABASE_SSL && env.NODE_ENV === 'production' && !env.DATABASE_SSL_REJECT_UNAUTHORIZED) {
    logger.warn?.('config.database_tls_verification_disabled', { nodeEnv: env.NODE_ENV });
  }
  if (env.ADMIN_BOOTSTRAP_SECRET && env.ADMIN_BOOTSTRAP_SECRET.length < 24) {
    if (env.NODE_ENV === 'production') {
      throw new Error('ADMIN_BOOTSTRAP_SECRET must be at least 24 characters in production');
    }
    logger.warn?.('config.short_secret', {
      key: 'ADMIN_BOOTSTRAP_SECRET',
      minLength: 24,
      nodeEnv: env.NODE_ENV,
    });
  }
  logger.info?.('config.validated', {
    nodeEnv: env.NODE_ENV,
    storageMode: env.EDGEIQ_STORAGE_MODE,
    hasDatabaseUrl: !!env.DATABASE_URL,
    databaseSsl: env.DATABASE_SSL,
    trustProxy: env.TRUST_PROXY,
    logLevel: env.LOG_LEVEL,
    appVersion: env.APP_VERSION,
  });
  return env;
}
