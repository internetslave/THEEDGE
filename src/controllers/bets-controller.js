import { getUserBets, saveUserBets } from '../services/bets-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function getBets(req, res) {
  try {
    const bets = await getUserBets(req.username);
    res.json({ success: true, bets });
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function saveBets(req, res) {
  try {
    const payload = await saveUserBets(req.username, req.body?.bets);
    res.json(payload);
  } catch (error) {
    handleControllerError(res, error);
  }
}
