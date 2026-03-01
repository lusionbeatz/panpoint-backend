import { Schema, model } from 'mongoose';
import { IMonthlyAnalytics } from '../types';

const MonthlyAnalyticsSchema = new Schema<IMonthlyAnalytics>(
  {
    shop:            { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    month:           { type: Number, required: true, min: 1, max: 12 },
    year:            { type: Number, required: true },
    totalOrders:     { type: Number, default: 0 },
    totalRevenue:    { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    netEarning:      { type: Number, default: 0 },
    topItems: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
        name:   { type: String },
        count:  { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

MonthlyAnalyticsSchema.index({ shop: 1, year: 1, month: 1 }, { unique: true });

export const MonthlyAnalytics = model<IMonthlyAnalytics>('MonthlyAnalytics', MonthlyAnalyticsSchema);
