import {
  // Food
  Coffee, Pizza, IceCream, Croissant, Soup, Cake, Cookie, Donut, Candy, Sandwich,
  Apple, Cherry, Carrot, Beef, Fish, EggFried, Milk, CupSoda,
  // Retail & fashion
  Shirt, ShoppingBag, Gift, Package, Glasses,
  // Services
  Scissors, Brush, Palette, Dumbbell, Bike, Car, Fuel, Plane, Hotel, KeyRound,
  // Beauty / wellness
  Flower2, Leaf, Sparkles,
  // Pets
  Dog, Cat, PawPrint,
  // Generic
  Heart, Star, Crown, Gem, Trophy, Stamp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface StampIconOption {
  name: string
  label: string
  Icon: LucideIcon
  category: 'food' | 'retail' | 'services' | 'beauty' | 'pets' | 'generic'
}

export const STAMP_ICONS: StampIconOption[] = [
  // Food & drinks
  { name: 'Coffee', label: 'قهوة', Icon: Coffee, category: 'food' },
  { name: 'CupSoda', label: 'مشروب غازي', Icon: CupSoda, category: 'food' },
  { name: 'Milk', label: 'حليب', Icon: Milk, category: 'food' },
  { name: 'Pizza', label: 'بيتزا', Icon: Pizza, category: 'food' },
  { name: 'Sandwich', label: 'ساندويتش', Icon: Sandwich, category: 'food' },
  { name: 'Soup', label: 'شوربة', Icon: Soup, category: 'food' },
  { name: 'Beef', label: 'لحم', Icon: Beef, category: 'food' },
  { name: 'Fish', label: 'سمك', Icon: Fish, category: 'food' },
  { name: 'EggFried', label: 'بيض', Icon: EggFried, category: 'food' },
  { name: 'Croissant', label: 'كرواسون', Icon: Croissant, category: 'food' },
  { name: 'IceCream', label: 'آيس كريم', Icon: IceCream, category: 'food' },
  { name: 'Cake', label: 'كيك', Icon: Cake, category: 'food' },
  { name: 'Cookie', label: 'كوكيز', Icon: Cookie, category: 'food' },
  { name: 'Donut', label: 'دونات', Icon: Donut, category: 'food' },
  { name: 'Candy', label: 'حلوى', Icon: Candy, category: 'food' },
  { name: 'Apple', label: 'تفاح', Icon: Apple, category: 'food' },
  { name: 'Cherry', label: 'كرز', Icon: Cherry, category: 'food' },
  { name: 'Carrot', label: 'جزر', Icon: Carrot, category: 'food' },

  // Retail & fashion
  { name: 'Shirt', label: 'ملابس', Icon: Shirt, category: 'retail' },
  { name: 'ShoppingBag', label: 'تسوق', Icon: ShoppingBag, category: 'retail' },
  { name: 'Gift', label: 'هدية', Icon: Gift, category: 'retail' },
  { name: 'Package', label: 'طرد', Icon: Package, category: 'retail' },
  { name: 'Glasses', label: 'نظارات', Icon: Glasses, category: 'retail' },

  // Services
  { name: 'Scissors', label: 'قص شعر', Icon: Scissors, category: 'services' },
  { name: 'Brush', label: 'فرشاة', Icon: Brush, category: 'services' },
  { name: 'Palette', label: 'ألوان', Icon: Palette, category: 'services' },
  { name: 'Dumbbell', label: 'لياقة', Icon: Dumbbell, category: 'services' },
  { name: 'Bike', label: 'دراجة', Icon: Bike, category: 'services' },
  { name: 'Car', label: 'سيارة', Icon: Car, category: 'services' },
  { name: 'Fuel', label: 'وقود', Icon: Fuel, category: 'services' },
  { name: 'Plane', label: 'طيران', Icon: Plane, category: 'services' },
  { name: 'Hotel', label: 'فندق', Icon: Hotel, category: 'services' },
  { name: 'KeyRound', label: 'مفتاح', Icon: KeyRound, category: 'services' },

  // Beauty / wellness
  { name: 'Flower2', label: 'ورد', Icon: Flower2, category: 'beauty' },
  { name: 'Leaf', label: 'نبات', Icon: Leaf, category: 'beauty' },
  { name: 'Sparkles', label: 'بريق', Icon: Sparkles, category: 'beauty' },

  // Pets
  { name: 'Dog', label: 'كلب', Icon: Dog, category: 'pets' },
  { name: 'Cat', label: 'قطة', Icon: Cat, category: 'pets' },
  { name: 'PawPrint', label: 'مخلب', Icon: PawPrint, category: 'pets' },

  // Generic
  { name: 'Heart', label: 'قلب', Icon: Heart, category: 'generic' },
  { name: 'Star', label: 'نجمة', Icon: Star, category: 'generic' },
  { name: 'Crown', label: 'تاج', Icon: Crown, category: 'generic' },
  { name: 'Gem', label: 'جوهرة', Icon: Gem, category: 'generic' },
  { name: 'Trophy', label: 'كأس', Icon: Trophy, category: 'generic' },
  { name: 'Stamp', label: 'ختم', Icon: Stamp, category: 'generic' },
]

export const CATEGORY_LABELS: Record<StampIconOption['category'], string> = {
  food: '🍽️ طعام ومشروبات',
  retail: '🛍️ تسوق',
  services: '🔧 خدمات',
  beauty: '✨ تجميل',
  pets: '🐾 حيوانات',
  generic: '⭐ عام',
}

/** True if the stamp icon value is a custom uploaded image (base64 data URL). */
export function isCustomIcon(value: string): boolean {
  return value.startsWith('data:')
}
