import type { Offer } from './types';

/**
 * Mock offers — 4 realistic Saudi restaurant promotions.
 * Replace with a real `/api/app/offers` fetch once the backend ships.
 */

// Helpers to create future dates relative to now.
const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) =>
  new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

export const OFFERS: Offer[] = [
  {
    id: 'offer-1',
    merchantName: 'مقهى نمق',
    merchantLogo: '/logos/namq.jpeg',
    merchantLogoLabel: 'نمق',
    merchantLogoColor: '#1F2937',
    storeId: '1',
    type: 'free_delivery',
    value: 0,
    headline: 'توصيل مجاني',
    description: 'على طلبات فوق 50 ريال',
    minOrder: 50,
    expiresAt: daysFromNow(3),
    urgent: false,
    coverImage:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'offer-2',
    merchantName: 'أفران الحطب',
    merchantLogo: '/logos/alhatab.jpeg',
    merchantLogoLabel: 'الحطب',
    merchantLogoColor: '#7C2D12',
    storeId: '2',
    type: 'percentage_discount',
    value: 40,
    headline: '40% خصم',
    description: 'على المخبوزات والمعجنات',
    minOrder: 30,
    code: 'BREAD40',
    expiresAt: hoursFromNow(5),
    urgent: true,
    coverImage:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'offer-3',
    merchantName: 'مطاعم الأفراح',
    merchantLogo: '/logos/alafrah.jpg',
    merchantLogoLabel: 'الأفراح',
    merchantLogoColor: '#991B1B',
    storeId: '3',
    type: 'meal_deal',
    value: 50,
    headline: 'اشترِ 1 واحصل على الثانية بنصف السعر',
    description: 'على جميع الوجبات الرئيسية',
    minOrder: 0,
    expiresAt: daysFromNow(7),
    urgent: false,
    coverImage:
      'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'offer-4',
    merchantName: 'شاورما الريم',
    merchantLogoLabel: 'الريم',
    merchantLogoColor: '#0F766E',
    storeId: '5',
    type: 'cashback',
    value: 15,
    headline: 'احصل على 15 ريال كاشباك',
    description: 'على طلبات فوق 80 ريال',
    minOrder: 80,
    expiresAt: daysFromNow(14),
    urgent: false,
    coverImage:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80',
  },
];
