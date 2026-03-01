import { Request, Response } from 'express';
import { Item } from '../models/Item.model';
import { Shop } from '../models/Shop.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../types';
import { uploadImage } from '../utils/cloudinary';

// GET /api/shops/:shopId/items  (public)
export const getItems = catchAsync(async (req: Request, res: Response) => {
  const { category, search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { shop: req.params.shopId, isAvailable: true };
  if (category) filter.category = new RegExp(category, 'i');
  if (search)   filter.name     = new RegExp(search, 'i');
  const items = await Item.find(filter).sort({ createdAt: -1 });
  res.json({ status: 'success', results: items.length, items });
});

// GET /api/shops/:shopId/items/:id  (public)
export const getItem = catchAsync(async (req: Request, res: Response) => {
  const item = await Item.findOne({ _id: req.params.id, shop: req.params.shopId });
  if (!item) throw new AppError('Item not found.', 404);
  res.json({ status: 'success', item });
});

// POST /api/items  (owner)
export const createItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('You do not have a shop.', 404);

  const { name, description, price, discountPrice, category, stock, unit } = req.body;
  if (!name || !price || !category)
    throw new AppError('name, price, and category are required.', 400);

  // Upload each image buffer to Cloudinary → get permanent HTTPS URLs
  const files  = req.files as Express.Multer.File[] | undefined;
  const images: string[] = [];
  if (files?.length) {
    for (const f of files) {
      const url = await uploadImage(f.buffer, 'panpoint/items');
      images.push(url);
    }
  }

  const item = await Item.create({
    shop: shop._id, name, description,
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : undefined,
    category, images,
    stock: stock ? Number(stock) : 0,
    unit,
  });

  res.status(201).json({ status: 'success', item });
});

// PATCH /api/items/:id  (owner)
export const updateItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);

  const allowed = ['name', 'description', 'price', 'discountPrice', 'category', 'isAvailable', 'stock', 'unit'];
  const updates: Record<string, unknown> = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, shop: shop._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!item) throw new AppError('Item not found.', 404);
  res.json({ status: 'success', item });
});

// DELETE /api/items/:id  (owner)
export const deleteItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);
  const item = await Item.findOneAndDelete({ _id: req.params.id, shop: shop._id });
  if (!item) throw new AppError('Item not found.', 404);
  res.json({ status: 'success', message: 'Item deleted.' });
});
