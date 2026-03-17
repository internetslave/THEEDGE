import { buildLeaderboardEntries } from '../services/leaderboard-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function getLeaderboard(req, res) {
  try {
    const entries = await buildLeaderboardEntries();
    res.json({ success: true, entries });
  } catch (error) {
    handleControllerError(res, error, 'Failed to build leaderboard');
  }
}
