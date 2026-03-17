import { createApp } from './app.js';
import { validateEnvironment, env } from './config/env.js';
import { getRepositoryStats } from './lib/repository/index.js';
import { logger } from './lib/logger.js';

validateEnvironment(logger);

const { app, startup } = await createApp();
const storeStats = await getRepositoryStats();

logger.info('startup.cache_restore', {
  users: storeStats.users,
  storageMode: storeStats.mode,
  aiCacheWarmEntries: startup.restoredAiEntries,
  oddsCacheRestored: startup.restoredOdds.restored,
  oddsCacheTotalSports: startup.restoredOdds.total,
  oddsCacheFullyWarm: startup.restoredOdds.restored === startup.restoredOdds.total,
});

app.listen(env.PORT, '0.0.0.0', () => {
  logger.info('startup.server_listening', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    appVersion: env.APP_VERSION,
    storage: {
      mode: storeStats.mode,
      hasDatabase: storeStats.hasDatabase,
      users: storeStats.users,
    },
    dependencies: {
      oddsApiConfigured: !!env.ODDS_API_KEY,
      anthropicConfigured: !!env.ANTHROPIC_API_KEY,
      racingApiConfigured: !!(env.RACING_API_USER && env.RACING_API_PASS),
    },
  });
});
