import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole = 'customer' | 'owner' | 'admin';
export type ShopOpenStatus = 'open' | 'late_night' | 'closed';
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
export type SubscriptionPlan = 'basic' | 'pro';
export type BankVerificationStatus = 'pending' | 'verified' | 'failed';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShop extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  shopName: string;
  description?: string;
  bannerImage?: string;
  ownerImage?: string;
  address: string;
  geoLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  phone?: string;
  openingTime: string;           // "HH:MM" 24h
  closingTime: string;           // "HH:MM" 24h
  lateNightAvailable: boolean;
  lateNightClosingTime?: string; // "HH:MM"
  isOpen: boolean;               // owner manual toggle
  planType: SubscriptionPlan;
  isApproved: boolean;
  isBlocked: boolean;
  avgRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IItem extends Document {
  _id: Types.ObjectId;
  shop: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  category: string;
  images: string[];
  isAvailable: boolean;
  stock: number;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  item: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderId: string;
  customer: Types.ObjectId;
  shop: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  commissionAmount: number;
  shopEarning: number;
  status: OrderStatus;
  pickupTime: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  shop: Types.ObjectId;
  order?: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  shop: Types.ObjectId;
  planType: SubscriptionPlan;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBankDetails extends Document {
  _id: Types.ObjectId;
  shop: Types.ObjectId;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  verificationStatus: BankVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMonthlyAnalytics extends Document {
  _id: Types.ObjectId;
  shop: Types.ObjectId;
  month: number;
  year: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netEarning: number;
  topItems: { itemId: Types.ObjectId; name: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}
export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
