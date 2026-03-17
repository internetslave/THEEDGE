import { Router } from 'express';
import { getBets, saveBets } from '../controllers/bets-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { publicRateLimit, writeRateLimit } from '../middleware/rate-limit.js';
import { requireJsonObject } from '../middleware/validate.js';

const router = Router();

router.get('/', publicRateLimit, authMiddleware, getBets);
router.post('/', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 2 }), saveBets);

export default router;
