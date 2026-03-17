import fs from 'fs/promises';
import { env } from '../config/env.js';
import { initializeRepository, closeRepository, getRepository } from '../lib/repository/index.js';
import { httpsReq } from '../utils/http.js';

async function loadSnapshotFromJsonBin() {
  if (!env.JSONBIN_API_KEY || !env.JSONBIN_BIN_ID) {
    throw new Error('JSONBIN_API_KEY and JSONBIN_BIN_ID are required to import directly from JSONBin');
  }

  const response = await httpsReq({
    hostname: 'api.jsonbin.io',
    path: `/v3/b/${env.JSONBIN_BIN_ID}/latest`,
    method: 'GET',
    headers: {
      'X-Master-Key': env.JSONBIN_API_KEY,
      'X-Bin-Meta': 'false',
    },
  });

  if (response.status !== 200) {
    throw new Error(`JSONBin import failed with status ${response.status}: ${response.body.substring(0, 200)}`);
  }

  return JSON.parse(response.body);
}

async function loadSnapshot() {
  const fileArgIndex = process.argv.findIndex((arg) => arg === '--file');
  if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
    const filePath = process.argv[fileArgIndex + 1];
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  return loadSnapshotFromJsonBin();
}

try {
  await initializeRepository();
  const repository = getRepository();
  const stats = await repository.getStats();
  if (!stats.hasDatabase) {
    throw new Error('JSONBin import requires a PostgreSQL-backed repository. Set DATABASE_URL and EDGEIQ_STORAGE_MODE=postgres.');
  }
  const snapshot = await loadSnapshot();
  await repository.importSnapshot(snapshot, { reset: true });
  console.log('JSONBin snapshot imported successfully');
} finally {
  await closeRepository();
}
