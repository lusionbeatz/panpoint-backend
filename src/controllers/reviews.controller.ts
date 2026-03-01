import { Request, Response } from 'express';
import { Review } from '../models/Review.model';
import { Shop } from '../models/Shop.model';
import { Order } from '../models/Order.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../types';

// GET /api/reviews/shop/:shopId  (public)
export const getShopReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await Review.find({ shop: req.params.shopId })
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 });
  res.json({ status: 'success', results: reviews.length, reviews });
});

// POST /api/reviews  (customer)
export const createReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { shopId, orderId, rating, comment } = req.body as {
    shopId: string; orderId: string; rating: number; comment?: string;
  };

  if (!shopId || !orderId || !rating)
    throw new AppError('shopId, orderId, and rating are required.', 400);
  if (Number(rating) < 1 || Number(rating) > 5)
    throw new AppError('Rating must be between 1 and 5.', 400);

  // Only allow reviews on completed orders belonging to this customer
  const order = await Order.findOne({
    _id: orderId, customer: req.user!._id, shop: shopId, status: 'completed',
  });
  if (!order) throw new AppError('No completed order found for this shop.', 400);

  const existing = await Review.findOne({ customer: req.user!._id, shop: shopId, order: orderId });
  if (existing) throw new AppError('You have already reviewed this order.', 409);

  const review = await Review.create({
    customer: req.user!._id, shop: shopId, order: orderId,
    rating: Number(rating), comment,
  });

  // Recalculate shop avgRating
  const stats = await Review.aggregate([
    { $match: { shop: order.shop } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Shop.findByIdAndUpdate(shopId, {
      avgRating:    parseFloat(stats[0].avg.toFixed(1)),
      totalReviews: stats[0].count,
    });
  }

  res.status(201).json({ status: 'success', review });
});

// DELETE /api/reviews/:id  (customer — own review only)
export const deleteReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, customer: req.user!._id });
  if (!review) throw new AppError('Review not found.', 404);
  res.json({ status: 'success', message: 'Review deleted.' });
});
