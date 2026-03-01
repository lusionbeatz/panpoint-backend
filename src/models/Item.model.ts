import { Schema, model } from 'mongoose';
import { IItem } from '../types';

const ItemSchema = new Schema<IItem>(
  {
    shop:          { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name:          { type: String, required: true, trim: true },
    description:   { type: String },
    price:         { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    category:      { type: String, required: true },
    images:        { type: [String], default: [] },
    isAvailable:   { type: Boolean, default: true },
    stock:         { type: Number, default: 0, min: 0 },
    unit:          { type: String },
  },
  { timestamps: true }
);

ItemSchema.index({ shop: 1, isAvailable: 1 });
ItemSchema.index({ category: 1 });

export const Item = model<IItem>('Item', ItemSchema);
