import { Request, Response } from 'express';
import { Shop } from '../models/Shop.model';
import { Item } from '../models/Item.model';
import { Review } from '../models/Review.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../types';
import { getShopStatus } from '../utils/shopStatus';
import { uploadImage } from '../utils/cloudinary';

// ── Helpers ────────────────────────────────────────────────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Upload a named field from multer files object to Cloudinary if it exists */
async function maybeUpload(
  files: Record<string, Express.Multer.File[]> | undefined,
  field: string,
  folder: string
): Promise<string | undefined> {
  if (files?.[field]?.[0]) {
    return uploadImage(files[field][0].buffer, folder);
  }
  return undefined;
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/shops/nearby  (public)
export const getNearbyShops = catchAsync(async (req: Request, res: Response) => {
  const { lat, lng, radius = '5000', openNow, lateNight, pan, cigarette } =
    req.query as Record<string, string>;

  if (!lat || !lng) throw new AppError('lat and lng are required query parameters.', 400);

  const shops = await Shop.find({
    isApproved: true,
    isBlocked:  false,
    geoLocation: {
      $near: {
        $geometry:    { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius),
      },
    },
  });

  const now = new Date();
  let results = shops.map((shop) => ({
    ...shop.toObject(),
    openStatus:     getShopStatus(shop, now),
    distanceMeters: haversineMeters(
      parseFloat(lat), parseFloat(lng),
      shop.geoLocation.coordinates[1],
      shop.geoLocation.coordinates[0]
    ),
  }));

  if (openNow   === 'true') results = results.filter((s) => s.openStatus === 'open');
  if (lateNight === 'true') results = results.filter((s) => s.openStatus === 'late_night');

  if (pan === 'true') {
    const ids    = results.map((s) => s._id.toString());
    const panIds = await Item.distinct('shop', { shop: { $in: ids }, category: /pan/i, isAvailable: true });
    const panSet = new Set(panIds.map(String));
    results = results.filter((s) => panSet.has(s._id.toString()));
  }
  if (cigarette === 'true') {
    const ids    = results.map((s) => s._id.toString());
    const cigIds = await Item.distinct('shop', { shop: { $in: ids }, category: /cigarette/i, isAvailable: true });
    const cigSet = new Set(cigIds.map(String));
    results = results.filter((s) => cigSet.has(s._id.toString()));
  }

  results.sort((a, b) => {
    if (a.planType === 'pro' && b.planType !== 'pro') return -1;
    if (a.planType !== 'pro' && b.planType === 'pro') return  1;
    return a.distanceMeters - b.distanceMeters;
  });

  res.json({ status: 'success', results: results.length, shops: results });
});

// GET /api/shops/:id  (public)
export const getShop = catchAsync(async (req: Request, res: Response) => {
  const shop = await Shop.findOne({ _id: req.params.id, isApproved: true, isBlocked: false })
    .populate('owner', 'name phone');
  if (!shop) throw new AppError('Shop not found.', 404);

  const [items, reviews] = await Promise.all([
    Item.find({ shop: shop._id, isAvailable: true }).sort({ createdAt: -1 }),
    Review.find({ shop: shop._id })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  res.json({
    status: 'success',
    shop:   { ...shop.toObject(), openStatus: getShopStatus(shop) },
    items,
    reviews,
  });
});

// GET /api/shops/my  (owner) — MUST be registered before /:id in routes
export const getMyShop = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('You do not have a shop yet.', 404);
  res.json({ status: 'success', shop: { ...shop.toObject(), openStatus: getShopStatus(shop) } });
});

// PATCH /api/shops/my  (owner)
export const updateMyShop = catchAsync(async (req: AuthRequest, res: Response) => {
  const allowed = [
    'shopName', 'description', 'phone',
    'openingTime', 'closingTime',
    'lateNightAvailable', 'lateNightClosingTime',
  ];
  const updates: Record<string, unknown> = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const bannerUrl = await maybeUpload(files, 'bannerImage', 'panpoint/shops');
  const ownerUrl  = await maybeUpload(files, 'ownerImage',  'panpoint/shops');
  if (bannerUrl) updates.bannerImage = bannerUrl;
  if (ownerUrl)  updates.ownerImage  = ownerUrl;

  const shop = await Shop.findOneAndUpdate(
    { owner: req.user!._id }, updates, { new: true, runValidators: true }
  );
  if (!shop) throw new AppError('Shop not found.', 404);
  res.json({ status: 'success', shop: { ...shop.toObject(), openStatus: getShopStatus(shop) } });
});

// PATCH /api/shops/my/toggle  (owner)
export const toggleShopOpen = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop)            throw new AppError('Shop not found.', 404);
  if (!shop.isApproved) throw new AppError('Shop is not approved yet. Contact admin.', 403);
  if (shop.isBlocked)   throw new AppError('Shop has been blocked by admin.', 403);
  shop.isOpen = !shop.isOpen;
  await shop.save();
  res.json({ status: 'success', isOpen: shop.isOpen, openStatus: getShopStatus(shop) });
});

// POST /api/shops  (owner)
export const createShop = catchAsync(async (req: AuthRequest, res: Response) => {
  const existing = await Shop.findOne({ owner: req.user!._id });
  if (existing) throw new AppError('You already created a shop.', 400);

  const {
    shopName, description, phone, coordinates,
    openingTime, closingTime, lateNightAvailable, lateNightClosingTime,
  } = req.body;

  if (!coordinates || coordinates.length !== 2)
    throw new AppError('coordinates must be [lng, lat]', 400);

  const files     = req.files as Record<string, Express.Multer.File[]> | undefined;
  const bannerUrl = await maybeUpload(files, 'bannerImage', 'panpoint/shops');
  const ownerUrl  = await maybeUpload(files, 'ownerImage',  'panpoint/shops');

  const shop = await Shop.create({
    owner: req.user!._id,
    shopName, description, phone,
    geoLocation: { type: 'Point', coordinates },
    openingTime, closingTime, lateNightAvailable, lateNightClosingTime,
    bannerImage: bannerUrl ?? '',
    ownerImage:  ownerUrl  ?? '',
  });

  res.status(201).json({ status: 'success', shop });
});
