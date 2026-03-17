import { Router } from 'express';
import { me, resetUserPin, signIn, signOut, signUp } from '../controllers/auth-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rate-limit.js';
import { requireJsonObject } from '../middleware/validate.js';

const router = Router();

router.post('/signup', authRateLimit, requireJsonObject({ maxKeys: 6 }), signUp);
router.post('/signin', authRateLimit, requireJsonObject({ maxKeys: 4 }), signIn);
router.post('/reset-pin', authRateLimit, requireJsonObject({ maxKeys: 4 }), resetUserPin);
router.get('/me', authMiddleware, me);
router.post('/signout', authMiddleware, signOut);

export default router;
