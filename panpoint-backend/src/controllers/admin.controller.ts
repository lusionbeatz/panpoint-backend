import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Shop } from '../models/Shop.model';
import { Order } from '../models/Order.model';
import { MonthlyAnalytics } from '../models/MonthlyAnalytics.model';
import { Subscription } from '../models/Subscription.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { SubscriptionPlan } from '../types';

// GET /api/admin/stats
export const getPlatformStats = catchAsync(async (_req: Request, res: Response) => {
  const [totalUsers, totalShops, pendingShops, totalOrders, revenueResult] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    Shop.countDocuments(),
    Shop.countDocuments({ isApproved: false, isBlocked: false }),
    Order.countDocuments({ status: 'completed' }),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
  ]);

  res.json({
    status: 'success',
    stats: {
      totalUsers,
      totalShops,
      pendingShops,
      totalCompletedOrders:  totalOrders,
      totalCommissionEarned: revenueResult[0]?.total || 0,
    },
  });
});

// GET /api/admin/shops
export const getAllShops = catchAsync(async (req: Request, res: Response) => {
  const { isApproved, isBlocked, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
  if (isBlocked  !== undefined) filter.isBlocked  = isBlocked  === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [shops, total] = await Promise.all([
    Shop.find(filter).populate('owner', 'name phone').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    Shop.countDocuments(filter),
  ]);
  res.json({ status: 'success', total, results: shops.length, shops });
});

// PATCH /api/admin/shops/:id/approve
export const approveShop = catchAsync(async (req: Request, res: Response) => {
  const shop = await Shop.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!shop) throw new AppError('Shop not found.', 404);
  res.json({ status: 'success', shop });
});

// PATCH /api/admin/shops/:id/reject
export const rejectShop = catchAsync(async (req: Request, res: Response) => {
  const shop = await Shop.findByIdAndUpdate(
    req.params.id, { isApproved: false, isOpen: false }, { new: true }
  );
  if (!shop) throw new AppError('Shop not found.', 404);
  res.json({ status: 'success', shop });
});

// PATCH /api/admin/shops/:id/block
export const toggleBlockShop = catchAsync(async (req: Request, res: Response) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) throw new AppError('Shop not found.', 404);

  shop.isBlocked = !shop.isBlocked;
  if (shop.isBlocked) shop.isOpen = false;
  await shop.save();

  res.json({ status: 'success', isBlocked: shop.isBlocked });
});

// PATCH /api/admin/shops/:id/plan
export const changeShopPlan = catchAsync(async (req: Request, res: Response) => {
  const { planType } = req.body as { planType: SubscriptionPlan };
  if (!['basic', 'pro'].includes(planType))
    throw new AppError('Invalid plan type. Must be "basic" or "pro".', 400);

  const shop = await Shop.findByIdAndUpdate(req.params.id, { planType }, { new: true });
  if (!shop) throw new AppError('Shop not found.', 404);

  await Subscription.findOneAndUpdate({ shop: shop._id, isActive: true }, { planType });

  res.json({ status: 'success', shop });
});

// GET /api/admin/users
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { role, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  res.json({ status: 'success', total, results: users.length, users });
});

// PATCH /api/admin/users/:id/toggle
export const toggleUserActive = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin') throw new AppError('Cannot deactivate admin accounts.', 400);

  user.isActive = !user.isActive;
  await user.save();
  res.json({ status: 'success', isActive: user.isActive });
});

// GET /api/admin/analytics
export const getPlatformAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { year = String(new Date().getFullYear()) } = req.query as Record<string, string>;

  const analytics = await MonthlyAnalytics.aggregate([
    { $match: { year: Number(year) } },
    {
      $group: {
        _id:             '$month',
        totalOrders:     { $sum: '$totalOrders' },
        totalRevenue:    { $sum: '$totalRevenue' },
        totalCommission: { $sum: '$totalCommission' },
        netEarning:      { $sum: '$netEarning' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ status: 'success', year: Number(year), analytics });
});

// GET /api/admin/analytics/shop/:id
export const getShopAnalytics = catchAsync(async (req: Request, res: Response) => {
  const analytics = await MonthlyAnalytics.find({ shop: req.params.id })
    .sort({ year: -1, month: -1 })
    .limit(12);
  res.json({ status: 'success', analytics });
});
