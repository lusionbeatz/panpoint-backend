import { Schema, model } from 'mongoose';
import { IShop } from '../types';

const ShopSchema = new Schema<IShop>(
  {
    owner:                { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopName:             { type: String, required: true, trim: true },
    description:          { type: String, trim: true },
    bannerImage:          { type: String, default: '' },
    ownerImage:           { type: String, default: '' },
    address:              { type: String, required: true, trim: true },
    geoLocation: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    phone:                { type: String, default: '' },
    openingTime:          { type: String, required: true, default: '09:00' },
    closingTime:          { type: String, required: true, default: '21:00' },
    lateNightAvailable:   { type: Boolean, default: false },
    lateNightClosingTime: { type: String },
    isOpen:               { type: Boolean, default: false },
    planType:             { type: String, enum: ['basic', 'pro'], default: 'basic' },
    isApproved:           { type: Boolean, default: false },
    isBlocked:            { type: Boolean, default: false },
    avgRating:            { type: Number, default: 0, min: 0, max: 5 },
    totalReviews:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

ShopSchema.index({ geoLocation: '2dsphere' });
ShopSchema.index({ owner: 1 });
ShopSchema.index({ isApproved: 1, isBlocked: 1, planType: 1 });

export const Shop = model<IShop>('Shop', ShopSchema);
