/**
 * Shape of a single merchant in the customer-facing stores directory.
 *
 * This type is what every component under `components/stores/`
 * consumes — when we wire up the real `/api/app/stores` endpoint,
 * the API client just needs to return values that match this shape
 * and nothing in the UI layer has to change.
 *
 * Fields split into two tiers:
 *  - "List tier" (required): the minimum needed to render the
 *    merchant in the stores directory grid/list.
 *  - "Detail tier" (optional): populated only for merchants whose
 *    detail page is mocked out. The detail screen falls back to
 *    STORES[0] when any of these fields is missing.
 */
export type Store = {
  // ─── List tier ─────────────────────────────────────────────
  id: string;
  /** Display name shown in the card body. */
  name: string;
  /** Remote cover image URL (Unsplash for now, real CDN later). */
  cover: string;
  /** Short Arabic label rendered on top of the colored logo square.
   *  Used only when `logoUrl` is not set (initials fallback). */
  logoLabel: string;
  /** Hex color used as the logo square background. */
  logoColor: string;
  /** Optional real merchant logo image URL. When set, the card and
   *  row both render this image inside the logo square instead of
   *  the colored initials fallback. */
  logoUrl?: string;
  /** Free-text category labels shown under the merchant name. */
  categories: string[];
  /** Average customer rating — kept in the type for compatibility
   *  with existing mock data, but the detail screen intentionally
   *  does NOT render any ratings per product decision. */
  rating: number;
  /** Distance from the customer in kilometers. */
  distanceKm: number;
  /** When true, the "يجيك طيارة" express ribbon is shown over the cover. */
  express?: boolean;

  // ─── Detail tier (optional) ───────────────────────────────
  /** Minimum order amount in SAR, shown in the stats row. */
  minOrder?: number;
  /** Delivery time window in minutes, shown as "{min} - {max} دقائق". */
  deliveryTime?: { min: number; max: number };
  /** Delivery fee in SAR, shown in the stats row. */
  deliveryFee?: number;
  /** When true, the orange "مميز" badge is pinned on the hero. */
  featured?: boolean;
  /** Promo cards shown between the stats row and the category tabs. */
  promos?: Promo[];
  /** Menu sections + products powering the rest of the detail screen. */
  menuSections?: MenuSection[];
};

/**
 * Promo banner variants rendered in `detail/PromoCard.tsx`. Modeled
 * as a discriminated union so each kind carries only the fields it
 * actually needs.
 */
export type Promo =
  | {
      id: string;
      kind: 'delivery_discount';
      /** Discounted delivery fee in SAR. */
      fee: number;
      /** Order minimum required to unlock the discount, in SAR. */
      minOrder: number;
    }
  | {
      id: string;
      kind: 'item_discount';
      /** Discount percent, 1–100. */
      percent: number;
      /** Localized scope label, e.g. "أصناف مختارة". */
      scope: string;
      /** When false, the "لا يوجد حد أدنى" sub-line is rendered. */
      hasMin: boolean;
    };

/**
 * One menu section powering the category tabs and product list. The
 * `layout` field decides whether the section is rendered as a 2-col
 * grid (used only for the "الأكثر مبيعًا" hero section) or a full-
 * width vertical list (everything else).
 */
export type MenuSection = {
  id: string;
  name: string;
  layout: 'grid' | 'list';
  products: Product[];
};

export type Product = {
  id: string;
  name: string;
  /** 2–3 line copy shown in the list layout only. Grid cards omit it. */
  description?: string;
  /** Remote product image URL — PNG with transparent background
   *  looks best on the brand-colored card background. */
  image: string;
  /** Regular price in SAR. */
  price: number;
  /** Discounted price in SAR — when set, triggers the strike-through
   *  regular price + red discount price pattern. */
  discountPrice?: number;
  /** Discount percent 1–100 — powers the red circular `%25` badge. */
  discountPercent?: number;
  /** When true, the "قابل للتعديل" caption is rendered under the image. */
  customizable?: boolean;
  /** Optional chip shown at the top of grid cards, e.g. "SAUDI MADE". */
  brandLabel?: string;

  // ─── Product detail tier (optional) ───────────────────────
  /** Estimated prep time in minutes, shown in the detail hero. */
  prepMinutes?: number;
  /** Energy in kcal, shown in the nutrition row. */
  calories?: number;
  /** Free-text allergen labels shown inside the allergens popup. */
  allergens?: string[];
  /** Per-macro nutrition facts shown in the nutrition popup. Keys
   *  and values are pre-localized — the label is what we display. */
  nutritionFacts?: NutritionFact[];
  /** Addon groups wired to the add-to-cart validator. */
  addonGroups?: AddonGroup[];
  /** Hide the entire addon section for this product. */
  hideAddons?: boolean;
  /** Hide the bottom-bar quantity control (one-tap add products). */
  hideQuantityControl?: boolean;
  /** When true, the detail screen disables the Add button with a
   *  "sold out" label and greys out the hero. */
  soldOut?: boolean;
  /** IDs of other products from the same merchant shown in the
   *  "add with your order" scroller. Resolved against every menu
   *  section in the store at runtime. When omitted the scroller
   *  falls back to the first N siblings in the current section. */
  crossSellIds?: string[];
};

export type NutritionFact = {
  /** Localized label — "مجموع الدهون" / "Total Fat" — prefilled. */
  label: string;
  /** Pre-formatted value string including unit — "43g", "1050mg". */
  value: string;
};

/**
 * One picker group inside the product detail screen — maps 1:1 to
 * the addon group shape used by the orders4 reference. The `type`
 * discriminator decides which picker UI renders for the options:
 *   - radio:     single-select, round pin indicator
 *   - checkbox:  multi-select, square pin indicator
 *   - quantity:  per-option QuantityControl with optional max
 */
export type AddonGroup = {
  id: string;
  title: string;
  subtitle?: string;
  required: boolean;
  type: 'radio' | 'checkbox' | 'quantity';
  /** Total quantity ceiling across ALL options in a quantity group. */
  maxSelections?: number;
  options: AddonOption[];
};

export type AddonOption = {
  id: string;
  name: string;
  /** Optional per-option surcharge added to the product price. */
  price?: number;
  /** Optional kcal shown next to the name as a small flame row. */
  calories?: number;
  /** Per-option ceiling for quantity groups. */
  maxQuantity?: number;
  /** Remote image shown in a round thumbnail at the start of the row. */
  image?: string;
  /** Disable the option and show a red "نفذت الكمية" chip. */
  soldOut?: boolean;
};

export type StoresViewMode = 'grid' | 'list';
