import { useRef, useState } from 'react';
import { Pressable, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '../../lib/colors';

type Props = {
  /** Outer diameter in px. Defaults to 36 (compact header size).
   *  Store hero uses 40 for larger touch targets on a photo. */
  size?: number;
  /** Icon size for the heart glyph. Defaults to 18. */
  iconSize?: number;
};

/**
 * Animated heart toggle — tap to like (red filled heart with a
 * spring pop), tap again to unlike (gray outline with a soft
 * scale-back).
 *
 * Visual style is identical to `CircleButton`: same warm cream
 * background (`#fcefe9`), same border-less pill shape, same
 * `colors.navIcon` for the idle icon color. The only difference
 * is the animation + the red filled state on like.
 *
 * No `variant` prop — both `CircleButton` and `FavoriteButton`
 * now share a single look (the "warm cream pill") since the user
 * unified the styles. If a transparent hero-overlay variant is
 * needed in the future, add it to BOTH components at the same
 * time so they stay in sync.
 */
export function FavoriteButton({
  size = 36,
  iconSize = 18,
}: Props) {
  const [liked, setLiked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const toggle = () => {
    const willLike = !liked;
    setLiked(willLike);

    if (willLike) {
      scaleAnim.setValue(0.2);
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.4,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Favorite"
      accessibilityState={{ selected: liked }}
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: '#fcefe9',
      }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Heart
          color={liked ? colors.state.danger : colors.navIcon}
          fill={liked ? colors.state.danger : 'transparent'}
          size={iconSize}
          strokeWidth={2}
        />
      </Animated.View>
    </Pressable>
  );
}
