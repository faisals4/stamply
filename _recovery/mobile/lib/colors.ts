/**
 * Stamply color palette as JS constants.
 *
 * These exist for values that can't be expressed as Tailwind/NativeWind
 * className strings — primarily lucide-react-native icon `color` props,
 * RN style objects (shadowColor, backgroundColor in inline styles),
 * and dynamic theme values used at runtime.
 *
 * Keep in sync with `tailwind.config.js` so the className API
 * (`text-brand`, `bg-gray-50`) and the JS API (`colors.brand.DEFAULT`,
 * `colors.ink.tertiary`) reference the same source of truth. Any
 * future restyle should change BOTH files together.
 */
export const colors = {
  /** Stamply brand orange — primary CTA and accent color. */
  brand: {
    DEFAULT: '#eb592e',
    50: '#FEF0EB',
    100: '#FCDACD',
    500: '#eb592e',
    600: '#D44A22',
    700: '#B03B1A',
    900: '#7A2912',
  },

  /**
   * Neutral text + border palette. Names describe USE not value so
   * a future redesign that swaps gray for cool-blue can change the
   * hex without renaming consumers.
   */
  /** Default icon color inside CircleButton nav buttons. */
  navIcon: '#464041',

  ink: {
    /** text-gray-900 — primary headings + body. */
    primary: '#111827',
    /** text-gray-700 — emphasized secondary text. */
    strong: '#374151',
    /** text-gray-500 — secondary copy + captions. */
    secondary: '#6B7280',
    /** text-gray-400 — tertiary/placeholder/disabled. */
    tertiary: '#9CA3AF',
    /** text-gray-300 — dividers/separators in dense rows. */
    divider: '#D1D5DB',
    /** border-gray-200 — standard surface border. */
    border: '#E5E7EB',
    /** border-gray-100 — softer divider used inside cards. */
    softBorder: '#F3F4F6',
  },

  /**
   * Semantic state colors. Each state has both a "solid" color (for
   * icons + bold text) and a "tint" background (for soft banners).
   */
  state: {
    success: '#047857',
    successTint: '#ECFDF5',
    warning: '#D97706',
    warningTint: '#FEF3C7',
    danger: '#EF4444',
    dangerTint: '#FEE2E2',
    /** Star rating fill — amber, used in store cards. */
    star: '#FBBF24',
    /** Express delivery accent — orange, used in store covers. */
    express: '#F97316',
  },

  /** App-wide page background. Matches `bg-page` in tailwind.config.js. */
  page: '#FFFFFF',
  /** Subtle off-white used for section backgrounds. */
  pageSoft: '#F9FAFB',
  white: '#FFFFFF',
  black: '#000000',
} as const;
