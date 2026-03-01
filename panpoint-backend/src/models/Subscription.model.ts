import { Schema, model } from 'mongoose';
import { ISubscription } from '../types';

const SubscriptionSchema = new Schema<ISubscription>(
  {
    shop:       { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    planType:   { type: String, enum: ['basic', 'pro'], default: 'basic' },
    startDate:  { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ shop: 1, isActive: 1 });

export const Subscription = model<ISubscription>('Subscription', SubscriptionSchema);
