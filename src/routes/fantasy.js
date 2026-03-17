import { Router } from 'express';
import { askFantasyController } from '../controllers/fantasy-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rate-limit.js';
import { requireJsonObject } from '../middleware/validate.js';

const router = Router();

router.post('/ask', aiRateLimit, authMiddleware, requireJsonObject({ maxKeys: 3 }), askFantasyController);

export default router;
