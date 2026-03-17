import { Router } from 'express';
import { getWeather } from '../controllers/weather-controller.js';
import { publicRateLimit } from '../middleware/rate-limit.js';

const router = Router();

router.get('/', publicRateLimit, getWeather);

export default router;
