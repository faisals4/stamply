/**
 * Central barrel export for all demo / mock data.
 * Import from `@/lib/demo` instead of individual files.
 */

export {
  ACTIVE_ORDERS,
  PAST_ORDERS,
  STATUS_CONFIG,
  DELIVERY_TYPE_CONFIG,
} from './orders-data';
export type {
  ActiveOrder,
  PastOrder,
  OrderStatus,
  DeliveryType,
  CarInfo,
} from './orders-data';

export { STORES, CATEGORIES } from './stores-data';
export { OFFERS } from './offers-data';
