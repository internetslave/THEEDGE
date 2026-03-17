import fs from 'fs/promises';
import path from 'path';
import { createPgPool } from '../lib/repository/postgres-client.js';
import { projectRoot } from '../config/paths.js';

const migrationsDir = path.join(projectRoot, 'db', 'migrations');
const pool = createPgPool();

async function run() {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedResult = await pool.query('select id from schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.id));

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (id) values ($1)', [file]);
      await client.query('commit');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

try {
  await run();
} finally {
  await pool.end();
}
