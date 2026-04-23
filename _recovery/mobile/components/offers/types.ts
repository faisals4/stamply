export type OfferType =
  | 'free_delivery'
  | 'percentage_discount'
  | 'meal_deal'
  | 'cashback';

export type Offer = {
  id: string;
  /** Merchant display name. */
  merchantName: string;
  /** Merchant logo URL (same logos used in stores directory). */
  merchantLogo?: string;
  /** Colored initials fallback when no logo URL. */
  merchantLogoLabel: string;
  merchantLogoColor: string;
  /** Store ID — used to navigate to the store on tap. */
  storeId: string;

  type: OfferType;
  /** Numeric value: 40 for 40%, 15 for 15 SAR, etc. */
  value: number;
  /** Headline shown large on the card. */
  headline: string;
  /** One-line description below the headline. */
  description: string;
  /** Minimum order in SAR (0 = no minimum). */
  minOrder: number;
  /** Optional promo code the user can copy. */
  code?: string;

  /** ISO date string — offer expiry. */
  expiresAt: string;
  /** When true, the card shows a red countdown timer. */
  urgent: boolean;

  /** Cover image URL (food photo) shown on the card. */
  coverImage?: string;
};
