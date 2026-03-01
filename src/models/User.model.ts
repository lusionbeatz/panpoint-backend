import { Schema, model } from 'mongoose';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true },
    phone:        { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['customer', 'owner', 'admin'], default: 'customer' },
    avatar:       { type: String },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1 });

export const User = model<IUser>('User', UserSchema);
