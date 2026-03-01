import { Router } from 'express';
import {
  getNearbyShops,
  getShop,
  getMyShop,
  updateMyShop,
  toggleShopOpen,
  createShop
} from '../controllers/shops.controller';

import { protect, restrictTo } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/* ===========================
   PUBLIC ROUTES
=========================== */

// GET /api/shops/nearby
router.get('/nearby', getNearbyShops);

/* ===========================
   OWNER ROUTES (Protected)
   MUST come before /:id to avoid conflict
=========================== */

// CREATE SHOP — POST /api/shops
router.post(
  '/',
  protect,
  restrictTo('owner'),
  upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'ownerImage',  maxCount: 1 },
  ]),
  createShop
);

// GET /api/shops/my  — MUST be before /:id
router.get('/my', protect, restrictTo('owner'), getMyShop);

// PATCH /api/shops/my
router.patch(
  '/my',
  protect,
  restrictTo('owner'),
  upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'ownerImage',  maxCount: 1 },
  ]),
  updateMyShop
);

// PATCH /api/shops/my/toggle
router.patch('/my/toggle', protect, restrictTo('owner'), toggleShopOpen);

/* ===========================
   PUBLIC PARAM ROUTES (after /my)
=========================== */

// GET /api/shops/:id
router.get('/:id', getShop);

export default router;
