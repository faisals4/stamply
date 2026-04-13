/**
 * Demo data for the Orders screen.
 * Extracted from `app/orders.tsx` so component files stay lean.
 * Replace with real API data when the backend ships.
 */

import { colors } from '../colors';

/* ─── Types ─── */

export type OrderStatus = 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';
export type DeliveryType = 'delivery' | 'pickup' | 'curbside';

export type CarInfo = {
  brand: string;
  color: string;
  plate: string;
};

export type ActiveOrder = {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantInitial: string;
  merchantColor: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  totalPrice: number;
  itemCount: number;
  estimatedMinutes: number;
  /** Branch name — shown for pickup & curbside orders */
  branchName?: string;
  /** Car info — shown for curbside orders */
  carInfo?: CarInfo;
};

export type PastOrder = {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantInitial: string;
  merchantColor: string;
  status: 'delivered' | 'cancelled';
  deliveryType: DeliveryType;
  totalPrice: number;
  itemCount: number;
  date: string; // ISO date string
};

/* ─── Demo Data ─── */

export const ACTIVE_ORDERS: ActiveOrder[] = [
  {
    id: 'active-1',
    orderNumber: '1042',
    merchantName: 'مقهى نمق',
    merchantInitial: 'ن',
    merchantColor: '#7C3AED',
    status: 'preparing',
    deliveryType: 'delivery',
    totalPrice: 45,
    itemCount: 3,
    estimatedMinutes: 15,
  },
  {
    id: 'active-2',
    orderNumber: '1043',
    merchantName: 'مخبز الحي',
    merchantInitial: 'ح',
    merchantColor: '#D97706',
    status: 'on_the_way',
    deliveryType: 'delivery',
    totalPrice: 28,
    itemCount: 2,
    estimatedMinutes: 8,
  },
  {
    id: 'active-3',
    orderNumber: '1044',
    merchantName: 'مقهى نمق',
    merchantInitial: 'ن',
    merchantColor: '#7C3AED',
    status: 'preparing',
    deliveryType: 'pickup',
    totalPrice: 22,
    itemCount: 2,
    estimatedMinutes: 10,
    branchName: 'فرع الملك فهد',
  },
  {
    id: 'active-4',
    orderNumber: '1045',
    merchantName: 'مخبز الحي',
    merchantInitial: 'ح',
    merchantColor: '#D97706',
    status: 'on_the_way',
    deliveryType: 'curbside',
    totalPrice: 35,
    itemCount: 4,
    estimatedMinutes: 5,
    branchName: 'فرع الملك فهد',
    carInfo: {
      brand: 'تويوتا كامري',
      color: 'أبيض',
      plate: 'أ ب ج ١٢٣٤',
    },
  },
];

export const PAST_ORDERS: PastOrder[] = [
  {
    id: 'past-1',
    orderNumber: '1038',
    merchantName: 'مقهى نمق',
    merchantInitial: 'ن',
    merchantColor: '#7C3AED',
    status: 'delivered',
    deliveryType: 'delivery',
    totalPrice: 67,
    itemCount: 4,
    date: '2026-03-25',
  },
  {
    id: 'past-2',
    orderNumber: '1035',
    merchantName: 'مطعم الرافدين',
    merchantInitial: 'ر',
    merchantColor: '#047857',
    status: 'delivered',
    deliveryType: 'pickup',
    totalPrice: 120,
    itemCount: 6,
    date: '2026-03-22',
  },
  {
    id: 'past-3',
    orderNumber: '1029',
    merchantName: 'مقهى نمق',
    merchantInitial: 'ن',
    merchantColor: '#7C3AED',
    status: 'cancelled',
    deliveryType: 'curbside',
    totalPrice: 34,
    itemCount: 2,
    date: '2026-03-18',
  },
];

/* ─── Status config ─── */

export const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; step: number }
> = {
  preparing: {
    color: colors.state.warning,
    bg: colors.state.warningTint,
    step: 1,
  },
  on_the_way: { color: '#2563EB', bg: '#EFF6FF', step: 2 },
  delivered: {
    color: colors.state.success,
    bg: colors.state.successTint,
    step: 3,
  },
  cancelled: {
    color: colors.state.danger,
    bg: colors.state.dangerTint,
    step: 0,
  },
};

/* ─── Delivery type badge config ─── */

export const DELIVERY_TYPE_CONFIG: Record<
  DeliveryType,
  { color: string; bg: string }
> = {
  delivery: { color: '#2563EB', bg: '#EFF6FF' },
  pickup: { color: '#7C3AED', bg: '#F5F3FF' },
  curbside: { color: '#1E40AF', bg: '#DBEAFE' },
};
