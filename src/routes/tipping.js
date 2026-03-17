import { Router } from 'express';
import {
  tippingAdminResult,
  tippingAdminRound,
  tippingAdminSetRole,
  tippingCreateComp,
  tippingFixtures,
  tippingJoinComp,
  tippingLeaderboard,
  tippingMyComps,
  tippingMyTips,
  tippingRoundResults,
  tippingSubmit,
} from '../controllers/tipping-controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { publicRateLimit, writeRateLimit } from '../middleware/rate-limit.js';
import { requireJsonObject } from '../middleware/validate.js';

const router = Router();

router.get('/fixtures', publicRateLimit, tippingFixtures);
router.get('/my-tips', publicRateLimit, authMiddleware, tippingMyTips);
router.post('/submit', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 2 }), tippingSubmit);
router.get('/leaderboard', publicRateLimit, tippingLeaderboard);
router.get('/round-results', publicRateLimit, tippingRoundResults);
router.post('/comps/create', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 4 }), tippingCreateComp);
router.post('/comps/join', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 2 }), tippingJoinComp);
router.get('/comps/mine', publicRateLimit, authMiddleware, tippingMyComps);
router.post('/admin/round', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 6 }), tippingAdminRound);
router.post('/admin/result', writeRateLimit, authMiddleware, requireJsonObject({ maxKeys: 5 }), tippingAdminResult);
router.post('/admin/set-role', writeRateLimit, optionalAuthMiddleware, requireJsonObject({ maxKeys: 4 }), tippingAdminSetRole);

export default router;
