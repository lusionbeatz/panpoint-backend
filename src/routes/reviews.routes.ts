import { Router } from 'express';
import { getShopReviews, createReview, deleteReview } from '../controllers/reviews.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/shop/:shopId', getShopReviews);
router.post('/',            protect, restrictTo('customer'), createReview);
router.delete('/:id',       protect, restrictTo('customer'), deleteReview);

export default router;
