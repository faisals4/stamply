import { View, Text, type TextStyle, type StyleProp } from 'react-native';
import { SaudiRiyal } from 'lucide-react-native';
import { colors } from '../../../lib/colors';

type Props = {
  /** Numeric price. Always rendered with exactly two decimal
   *  places — `5` shows as `5.00`, `24.75` shows as `24.75`. */
  amount: number;
  /** Font size for the number. The Riyal glyph sizes itself to
   *  match so the two stay visually balanced. Defaults to 14. */
  size?: number;
  /** Color applied to BOTH the number text and the Riyal glyph's
   *  stroke. Defaults to `ink.primary` (#111827). */
  color?: string;
  /** When true, the number renders bold. Glyph stroke stays at
   *  2 — lucide SVG strokes don't have a "bold" variant. */
  bold?: boolean;
  /** Extra Text styles, e.g. `textDecorationLine: 'line-through'`
   *  for strike-through discount prices. Applied to both the
   *  number AND the icon wrapper so the strike runs across both. */
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Shared price renderer — a numeric value followed by the Saudi
 * Riyal glyph (the new official symbol, not "ر.س"). Used everywhere
 * the customer app needs to display a price: stats row, product
 * cards, discount lines, promo cards, cart bar, cart summary.
 *
 * Layout:
 *   [  123.45   ﷼  ]
 *
 * **Formatting contract:** the number is ALWAYS rendered with
 * exactly two decimal places via `toFixed(2)`. `5` becomes
 * `5.00`, `24.75` stays `24.75`, `1050` becomes `1050.00`.
 * Centralising the formatting here means every store / product /
 * cart screen shows prices the same way with zero per-call
 * boilerplate — this is the canonical price rendering for the
 * entire customer app.
 *
 * The View is `flex-row` with a small gap, and it inherits
 * direction from the active document so the order flips naturally
 * in RTL vs LTR. The `SaudiRiyal` lucide icon is sized slightly
 * smaller than the font-size so it visually reads as the same
 * cap-height as the adjacent digits.
 *
 * Color + size + bold are all props so any caller can match its
 * surrounding typography without having to know about lucide or
 * the colors file.
 */
export function Price({
  amount,
  size = 14,
  color = colors.ink.primary,
  bold = false,
  textStyle,
}: Props) {
  // Riyal glyph target: ~0.9× the font size looks balanced against
  // digit cap-heights in lucide's stroke-based icons.
  const iconSize = Math.round(size * 0.9);
  // Always two decimals. Falls back to "0.00" when the input is
  // NaN / undefined so the glyph never sits next to a blank slot.
  const formatted = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';

  return (
    <View
      className="flex-row items-center"
      style={{ gap: 4 }}
    >
      <Text
        style={[
          {
            fontSize: size,
            color,
            fontWeight: bold ? '700' : '400',
          },
          textStyle,
        ]}
      >
        {formatted}
      </Text>
      <SaudiRiyal color={color} size={iconSize} strokeWidth={2} />
    </View>
  );
}
