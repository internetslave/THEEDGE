import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard-controller.js';
import { publicRateLimit } from '../middleware/rate-limit.js';

const router = Router();

router.get('/', publicRateLimit, getLeaderboard);

export default router;
