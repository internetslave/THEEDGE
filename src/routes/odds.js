import { Router } from 'express';
import { analyse, getOdds, getOddsUsageStatus } from '../controllers/odds-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiRateLimit, publicRateLimit } from '../middleware/rate-limit.js';
import { requireJsonObject } from '../middleware/validate.js';

const router = Router();

router.get('/odds', publicRateLimit, getOdds);
router.get('/odds/usage', publicRateLimit, getOddsUsageStatus);
router.post('/analyse', aiRateLimit, authMiddleware, requireJsonObject({ maxKeys: 6 }), analyse);

export default router;
