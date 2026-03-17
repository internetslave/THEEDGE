import { getRepository } from '../lib/repository/index.js';

export async function buildLeaderboardEntries() {
  return getRepository().getLeaderboardEntries();
}
