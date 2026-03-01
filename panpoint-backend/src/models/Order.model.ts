import { Schema, model } from 'mongoose';
import { IOrder } from '../types';

const OrderSchema = new Schema<IOrder>(
  {
    orderId:  { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shop:     { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: [
      {
        item:     { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        name:     { type: String, required: true },
        price:    { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount:      { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    shopEarning:      { type: Number, required: true },
    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    pickupTime: { type: Date, required: true },
    notes:      { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ shop: 1, status: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', OrderSchema);
