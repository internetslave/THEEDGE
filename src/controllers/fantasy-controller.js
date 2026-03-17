import { askFantasy } from '../services/fantasy-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function askFantasyController(req, res) {
  try {
    res.json(await askFantasy(req.body?.prompt, req.body?.title));
  } catch (error) {
    handleControllerError(res, error, 'AI request failed');
  }
}
