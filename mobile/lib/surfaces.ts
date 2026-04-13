/**
 * Shared className constants for repeating surface treatments across
 * the customer app.
 *
 * Single source of truth for "what does a Stamply card look like" —
 * keep new screens importing from here so a future restyle (e.g.
 * changing rounded-2xl to rounded-3xl, or border-gray-200 to a
 * brand-tinted border) can be done in ONE place instead of grepping
 * for 6+ duplicated className strings.
 *
 * Pair with `mobile/lib/shadows.ts` for elevation tokens — surface
 * styling and shadow are deliberately separated because some screens
 * (e.g. settings) want the surface without the lift, while others
 * (e.g. stores, cards) want both.
 */
export const surfaces = {
  /**
   * The neutral white content card used everywhere — settings rows,
   * the merchant store cards, the stamps history block on the card
   * detail page, etc. Pair with `p-4` (or your own padding) at the
   * call site since not every consumer wants the same inset; the
   * StoreCard wraps a full-bleed cover image and handles its body
   * padding internally.
   */
  card: 'rounded-2xl border border-gray-200 bg-white',
} as const;
