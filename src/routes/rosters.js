import { Router } from 'express';
import { getRosters } from '../controllers/rosters-controller.js';

const router = Router();

router.get('/', getRosters);

export default router;
