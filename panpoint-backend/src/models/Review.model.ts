import { Schema, model } from 'mongoose';
import { IReview } from '../types';

const ReviewSchema = new Schema<IReview>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shop:     { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    order:    { type: Schema.Types.ObjectId, ref: 'Order' },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    comment:  { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

ReviewSchema.index({ customer: 1, shop: 1, order: 1 }, { unique: true });
ReviewSchema.index({ shop: 1 });

export const Review = model<IReview>('Review', ReviewSchema);
