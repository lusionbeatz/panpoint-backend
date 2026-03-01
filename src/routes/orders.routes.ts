import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getShopOrders,
  updateOrderStatus,
} from '../controllers/orders.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Customer routes
router.post('/',            restrictTo('customer'), createOrder);
router.get('/',             restrictTo('customer'), getMyOrders);
router.get('/:id',          restrictTo('customer'), getOrder);
router.patch('/:id/cancel', restrictTo('customer'), cancelOrder);

// Owner routes
router.get('/shop/list',         restrictTo('owner'), getShopOrders);
router.patch('/shop/:id/status', restrictTo('owner'), updateOrderStatus);

export default router;
