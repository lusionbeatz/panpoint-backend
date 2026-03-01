import { Response } from 'express';
import { Subscription } from '../models/Subscription.model';
import { Shop } from '../models/Shop.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest, SubscriptionPlan } from '../types';

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  basic: 99,
  pro:   499,
};

// GET /api/subscriptions/plans  (public)
export const getPlans = (_req: unknown, res: Response): void => {
  res.json({
    status: 'success',
    plans: [
      {
        id:         'basic',
        name:       'Basic Plan',
        price:      99,
        duration:   '30 days',
        commission: 'Rs.2 per completed order',
        features:   ['Standard listing', 'Reservation alerts', 'Monthly analytics'],
      },
      {
        id:         'pro',
        name:       'Pro Plan',
        price:      499,
        duration:   '30 days',
        commission: 'Rs.0 commission',
        features:   [
          'Zero commission',
          'Priority search ranking',
          'Golden premium badge',
          'Advanced analytics',
          'Reservation alerts',
        ],
      },
    ],
  });
};

// GET /api/subscriptions/my  (owner)
export const getMySubscription = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);

  const subscription = await Subscription.findOne({ shop: shop._id, isActive: true });
  if (!subscription) throw new AppError('No active subscription found.', 404);

  res.json({ status: 'success', subscription, currentPlan: shop.planType });
});

// POST /api/subscriptions/upgrade  (owner)
export const upgradeSubscription = catchAsync(async (req: AuthRequest, res: Response) => {
  const { planType } = req.body as { planType: SubscriptionPlan };

  if (!['basic', 'pro'].includes(planType))
    throw new AppError('Invalid plan. Choose basic or pro.', 400);

  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);

  // Deactivate all current subscriptions
  await Subscription.updateMany({ shop: shop._id, isActive: true }, { isActive: false });

  const startDate  = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  const subscription = await Subscription.create({
    shop: shop._id,
    planType,
    startDate,
    expiryDate,
    isActive: true,
  });

  // Update shop planType
  shop.planType = planType;
  await shop.save();

  res.status(201).json({
    status: 'success',
    subscription,
    message: `Upgraded to ${planType.toUpperCase()} plan.`,
  });
});
