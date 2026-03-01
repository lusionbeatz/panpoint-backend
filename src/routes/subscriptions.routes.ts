import { Router } from 'express';
import { getPlans, getMySubscription, upgradeSubscription } from '../controllers/subscriptions.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/plans',   getPlans);
router.get('/my',      protect, restrictTo('owner'), getMySubscription);
router.post('/upgrade', protect, restrictTo('owner'), upgradeSubscription);

export default router;
