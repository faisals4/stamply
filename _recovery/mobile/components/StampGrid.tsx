import { View } from 'react-native';

type Props = {
  /** Stamps the customer has collected so far. */
  count: number;
  /** Total stamps required for the next (or only) reward. */
  total: number;
  /** Circle diameter in pixels. */
  size?: number;
};

/**
 * Visualises a stamp card as a grid of circles: filled (brand color)
 * for stamps already earned, empty (grey outline) for remaining.
 *
 * Wraps naturally via flex-wrap. If total is 0 or null, renders nothing.
 */
export function StampGrid({ count, total, size = 44 }: Props) {
  if (!total || total <= 0) return null;

  // Cap the "overflow" visual at `total` — any extra stamps beyond the
  // first reward are handled by the all_rewards list below.
  const filled = Math.min(count, total);

  return (
    <View className="flex-row flex-wrap">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              margin: 4,
            }}
            className={
              isFilled
                ? 'items-center justify-center bg-stamp-filled'
                : 'items-center justify-center border-2 border-stamp-empty bg-white'
            }
          />
        );
      })}
    </View>
  );
}
