import { Order } from '../models/Order.model';

export const generateOrderId = async (): Promise<string> => {
  const count = await Order.countDocuments();
  const padded = String(count + 1).padStart(6, '0');
  return `PP${padded}`;
};
