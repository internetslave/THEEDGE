import authRoutes from './auth.js';
import betsRoutes from './bets.js';
import fantasyRoutes from './fantasy.js';
import healthRoutes from './health.js';
import leaderboardRoutes from './leaderboard.js';
import oddsRoutes from './odds.js';
import pageRoutes from './pages.js';
import rostersRoutes from './rosters.js';
import tippingRoutes from './tipping.js';
import weatherRoutes from './weather.js';

export function registerApiRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/bets', betsRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api', oddsRoutes);
  app.use('/api/rosters', rostersRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/tipping', tippingRoutes);
  app.use('/api/fantasy', fantasyRoutes);
  app.use('/api/weather', weatherRoutes);
}

export function registerPageRoutes(app) {
  app.use(pageRoutes);
}
