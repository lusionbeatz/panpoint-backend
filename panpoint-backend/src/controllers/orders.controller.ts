import { Request, Response } from 'express';
import { Order } from '../models/Order.model';
import { Item } from '../models/Item.model';
import { Shop } from '../models/Shop.model';
import { MonthlyAnalytics } from '../models/MonthlyAnalytics.model';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest, OrderStatus } from '../types';
import { calculateCommission } from '../services/commission.service';
import { emitOrderUpdate, emitToUser } from '../config/socket';
import { getShopStatus } from '../utils/shopStatus';
import { generateOrderId } from '../utils/generateOrderId';

const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['ready',     'cancelled'],
  ready:     ['completed'],
  completed: [],
  cancelled: [],
};

// POST /api/orders  (customer)
export const createOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const { shopId, items, pickupTime, notes } = req.body as {
    shopId:     string;
    items:      { itemId: string; quantity: number }[];
    pickupTime: string;
    notes?:     string;
  };

  if (!shopId)                 throw new AppError('shopId is required.', 400);
  if (!items || !items.length) throw new AppError('items array cannot be empty.', 400);
  if (!pickupTime)             throw new AppError('pickupTime is required.', 400);

  // Validate shop
  const shop = await Shop.findById(shopId);
  if (!shop)            throw new AppError('Shop not found.', 404);
  if (!shop.isApproved) throw new AppError('This shop is not yet approved.', 400);
  if (shop.isBlocked)   throw new AppError('This shop is currently unavailable.', 400);

  // Validate shop is open or in late-night window
  const openStatus = getShopStatus(shop);
  if (openStatus === 'closed')
    throw new AppError('Shop is currently closed. Cannot place a reservation.', 400);

  // Validate pickup time — minimum 15 minutes from now
  const pickup    = new Date(pickupTime);
  const minPickup = new Date(Date.now() + 15 * 60 * 1000);
  if (isNaN(pickup.getTime()))  throw new AppError('Invalid pickupTime format.', 400);
  if (pickup < minPickup)
    throw new AppError('Pickup time must be at least 15 minutes from now.', 400);

  // Build order items + validate stock
  let subtotal   = 0;
  const orderItems = [];

  for (const entry of items) {
    const dbItem = await Item.findById(entry.itemId);
    if (!dbItem)                               throw new AppError(`Item ${entry.itemId} not found.`, 404);
    if (dbItem.shop.toString() !== shopId)     throw new AppError(`Item does not belong to this shop.`, 400);
    if (!dbItem.isAvailable)                   throw new AppError(`"${dbItem.name}" is currently not available.`, 400);
    if (dbItem.stock < entry.quantity)         throw new AppError(`Insufficient stock for "${dbItem.name}".`, 400);

    const price = dbItem.discountPrice ?? dbItem.price;
    subtotal   += price * entry.quantity;

    orderItems.push({ item: dbItem._id, name: dbItem.name, price, quantity: entry.quantity });

    // Reserve stock immediately
    dbItem.stock -= entry.quantity;
    await dbItem.save();
  }

  // Commission: Rs.2 for basic plan, Rs.0 for pro plan
  const { totalAmount, commissionAmount, shopEarning } =
    calculateCommission(subtotal, shop.planType);

  const orderId = await generateOrderId();

  const order = await Order.create({
    orderId,
    customer:         req.user!._id,
    shop:             shopId,
    items:            orderItems,
    totalAmount,
    commissionAmount,
    shopEarning,
    status:           'pending',
    pickupTime:       pickup,
    notes,
  });

  // Realtime: emit new_order to owner's shop room
  emitOrderUpdate(shopId, 'new_order', {
    orderId:      order.orderId,
    customerName: req.user!.name,
    items:        orderItems,
    pickupTime:   pickup,
    totalAmount,
  });

  res.status(201).json({ status: 'success', order });
});

// GET /api/orders  (customer — own orders)
export const getMyOrders = catchAsync(async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ customer: req.user!._id })
    .populate('shop', 'shopName bannerImage address phone')
    .sort({ createdAt: -1 });

  res.json({ status: 'success', results: orders.length, orders });
});

// GET /api/orders/:id  (customer)
export const getOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user!._id })
    .populate('shop', 'shopName bannerImage phone address');
  if (!order) throw new AppError('Order not found.', 404);
  res.json({ status: 'success', order });
});

// PATCH /api/orders/:id/cancel  (customer)
export const cancelOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user!._id });
  if (!order) throw new AppError('Order not found.', 404);

  if (!ORDER_STATUS_FLOW[order.status].includes('cancelled'))
    throw new AppError(`Order cannot be cancelled at status: "${order.status}".`, 400);

  order.status = 'cancelled';
  await order.save();

  // Restore reserved stock
  for (const oi of order.items) {
    await Item.findByIdAndUpdate(oi.item, { $inc: { stock: oi.quantity } });
  }

  emitOrderUpdate(order.shop.toString(), 'order_status_update', {
    orderId: order.orderId,
    status:  'cancelled',
  });

  res.json({ status: 'success', order });
});

// GET /api/orders/shop/list  (owner)
export const getShopOrders = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);

  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { shop: shop._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name phone')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  res.json({ status: 'success', total, results: orders.length, orders });
});

// PATCH /api/orders/shop/:id/status  (owner)
export const updateOrderStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const shop = await Shop.findOne({ owner: req.user!._id });
  if (!shop) throw new AppError('Shop not found.', 404);

  const { status } = req.body as { status: OrderStatus };
  if (!status) throw new AppError('status field is required.', 400);

  const order = await Order.findOne({ _id: req.params.id, shop: shop._id });
  if (!order) throw new AppError('Order not found.', 404);

  const allowed = ORDER_STATUS_FLOW[order.status];
  if (!allowed.includes(status))
    throw new AppError(`Cannot transition from "${order.status}" to "${status}".`, 400);

  order.status = status;
  await order.save();

  // Realtime: notify customer
  emitToUser(order.customer.toString(), 'order_status_update', {
    orderId: order.orderId,
    status,
  });

  // Update MonthlyAnalytics when order is completed (commission recorded here)
  if (status === 'completed') {
    const now = new Date();
    await MonthlyAnalytics.findOneAndUpdate(
      { shop: shop._id, month: now.getMonth() + 1, year: now.getFullYear() },
      {
        $inc: {
          totalOrders:     1,
          totalRevenue:    order.totalAmount,
          totalCommission: order.commissionAmount,
          netEarning:      order.shopEarning,
        },
      },
      { upsert: true, new: true }
    );
  }

  res.json({ status: 'success', order });
});
