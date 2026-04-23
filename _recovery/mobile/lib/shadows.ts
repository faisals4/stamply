import type { ViewStyle } from 'react-native';

/**
 * Shared elevation tokens for the customer app.
 *
 * Single source of truth for every drop shadow used across the app
 * — keep new components importing from here so the surface system
 * stays cohesive instead of drifting into per-screen tweaks.
 *
 * `card` is the canonical Stamply card lift: a low offset, tight
 * blur, very soft opacity. Subtle enough to read against gray-50
 * page backgrounds without competing with photography or content.
 * Used by `CardVisual` (loyalty cards), `StoreCard` (merchant
 * directory), and any future card-shaped surface.
 */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    // Android approximation — elevation has a different visual
    // model than iOS shadowRadius, picked to match the same
    // perceived lift on Material Design surfaces.
    elevation: 1,
  } satisfies ViewStyle,
} as const;
