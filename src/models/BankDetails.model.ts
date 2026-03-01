import { Schema, model } from 'mongoose';
import { IBankDetails } from '../types';

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    shop:               { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    accountHolderName:  { type: String, required: true, trim: true },
    accountNumber:      { type: String, required: true },
    ifscCode:           { type: String, required: true, trim: true, uppercase: true },
    upiId:              { type: String },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

BankDetailsSchema.index({ shop: 1 }, { unique: true });

export const BankDetails = model<IBankDetails>('BankDetails', BankDetailsSchema);
