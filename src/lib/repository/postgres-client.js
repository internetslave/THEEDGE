import { Pool } from 'pg';
import { env } from '../../config/env.js';

export function createPgPool(overrides = {}) {
  const connectionString = overrides.DATABASE_URL || env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL operations');
  }

  const sslEnabled = overrides.DATABASE_SSL ?? env.DATABASE_SSL;
  const rejectUnauthorized = overrides.DATABASE_SSL_REJECT_UNAUTHORIZED ?? env.DATABASE_SSL_REJECT_UNAUTHORIZED;

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized } : false,
  });
}
