/**
 * PanPoint commission model (charged per completed order):
 *   basic plan -> Rs.2 flat
 *   pro plan   -> Rs.0
 */

export interface CommissionResult {
  totalAmount: number;
  commissionAmount: number;
  shopEarning: number;
}

export const COMMISSION_BY_PLAN: Record<'basic' | 'pro', number> = {
  basic: 2,
  pro:   0,
};

export const calculateCommission = (
  subtotal: number,
  planType: 'basic' | 'pro' = 'basic'
): CommissionResult => {
  const commissionAmount = COMMISSION_BY_PLAN[planType];
  const shopEarning = parseFloat((subtotal - commissionAmount).toFixed(2));

  return {
    totalAmount: subtotal,
    commissionAmount,
    shopEarning,
  };
};
