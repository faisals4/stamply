import { useRef, useState } from 'react';
import { Pressable, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '../../lib/colors';

type Props = {
  size?: number;
  iconSize?: number;
  /** Controlled mode: pass true/false to control the heart state externally. */
  isFavorite?: boolean;
  /** Called when the user taps the heart. Use for API calls. */
  onToggle?: (newState: boolean) => void;
};

/**
 * Animated heart toggle — tap to like (red filled heart with a
 * spring pop), tap again to unlike (gray outline with a soft
 * scale-back).
 *
 * Supports both controlled (`isFavorite` + `onToggle`) and
 * uncontrolled (local state) modes.
 */
export function FavoriteButton({
  size = 36,
  iconSize = 18,
  isFavorite,
  onToggle,
}: Props) {
  const [localLiked, setLocalLiked] = useState(false);
  const liked = isFavorite ?? localLiked;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const toggle = () => {
    const willLike = !liked;
    if (onToggle) {
      onToggle(willLike);
    } else {
      setLocalLiked(willLike);
    }

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
        backgroundColor: '#F0F0F0',
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
