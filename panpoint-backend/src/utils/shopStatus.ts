import { IShop, ShopOpenStatus } from '../types';

/**
 * Parse "HH:MM" string -> total minutes from midnight
 */
function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * getShopStatus - determines real-time open status of a shop.
 *
 * Rules:
 *   1. If owner has toggled isOpen = false  -> 'closed'
 *   2. Current time in openingTime..closingTime window -> 'open'
 *   3. lateNightAvailable && time in closingTime..lateNightClosingTime window -> 'late_night'
 *   4. Otherwise -> 'closed'
 *
 * All times are "HH:MM" 24h strings. Windows can wrap midnight.
 */
export function getShopStatus(
  shop: Pick<IShop, 'isOpen' | 'openingTime' | 'closingTime' | 'lateNightAvailable' | 'lateNightClosingTime'>,
  now: Date = new Date()
): ShopOpenStatus {
  if (!shop.isOpen) return 'closed';

  const current   = now.getHours() * 60 + now.getMinutes();
  const openMin   = toMinutes(shop.openingTime  || '09:00');
  const closeMin  = toMinutes(shop.closingTime  || '21:00');

  // --- Normal hours window ---
  if (openMin <= closeMin) {
    // Same-day window e.g. 09:00 -> 21:00
    if (current >= openMin && current < closeMin) return 'open';
  } else {
    // Overnight window e.g. 20:00 -> 04:00 (wraps midnight)
    if (current >= openMin || current < closeMin) return 'open';
  }

  // --- Late night window ---
  if (shop.lateNightAvailable && shop.lateNightClosingTime) {
    const lateMin = toMinutes(shop.lateNightClosingTime);

    // Late night always starts at closingTime and wraps midnight
    // e.g. closingTime=23:00, lateNightClosingTime=03:00
    if (lateMin <= closeMin) {
      // Wraps midnight: current >= closeMin  OR  current < lateMin
      if (current >= closeMin || current < lateMin) return 'late_night';
    } else {
      // Same night: current >= closeMin AND current < lateMin
      if (current >= closeMin && current < lateMin) return 'late_night';
    }
  }

  return 'closed';
}
