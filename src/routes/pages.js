import { Router } from 'express';
import { dashboardPage, fantasyPage, tippingPage } from '../controllers/pages-controller.js';

const router = Router();

router.get('/fantasy', fantasyPage);
router.get('/tipping', tippingPage);
router.get('*', dashboardPage);

export default router;
