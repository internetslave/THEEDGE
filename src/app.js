import express from 'express';
import { publicDir } from './config/paths.js';
import { initializeRepository } from './lib/repository/index.js';
import { errorHandler, notFoundApiHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { applyCoreMiddleware } from './middleware/security.js';
import { registerApiRoutes, registerPageRoutes } from './routes/index.js';
import { restorePersistedAnalysisCache } from './services/analysis-service.js';
import { restorePersistedOddsCache } from './services/odds-service.js';

export async function createApp() {
  await initializeRepository();
  const restoredAiEntries = await restorePersistedAnalysisCache();
  const restoredOdds = await restorePersistedOddsCache();

  const app = express();
  applyCoreMiddleware(app, publicDir);
  app.use(requestLogger);
  registerApiRoutes(app);
  app.use('/api/*', notFoundApiHandler);
  registerPageRoutes(app);
  app.use(errorHandler);

  return {
    app,
    startup: {
      restoredAiEntries,
      restoredOdds,
    },
  };
}
