import { Router } from 'express';
import {
  getPlatformStats,
  getAllShops,
  approveShop,
  rejectShop,
  toggleBlockShop,
  changeShopPlan,
  getAllUsers,
  toggleUserActive,
  getPlatformAnalytics,
  getShopAnalytics,
} from '../controllers/admin.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/stats',              getPlatformStats);
router.get('/analytics',          getPlatformAnalytics);
router.get('/analytics/shop/:id', getShopAnalytics);

router.get('/shops',                getAllShops);
router.patch('/shops/:id/approve',  approveShop);
router.patch('/shops/:id/reject',   rejectShop);
router.patch('/shops/:id/block',    toggleBlockShop);
router.patch('/shops/:id/plan',     changeShopPlan);

router.get('/users',               getAllUsers);
router.patch('/users/:id/toggle',  toggleUserActive);

export default router;
