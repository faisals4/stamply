import { ReactNode, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  Animated,
  View,
  Platform,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * `'bottom'` (default) — content sits at the bottom of the screen,
   * its height determined by its children. Used by short confirm
   * sheets like the logout dialog.
   * `'top'` — content fills almost the full viewport with a small
   * top gap. Used by long content sheets (card details) where the
   * inner ScrollView needs the room.
   */
  align?: 'bottom' | 'top';
};

/**
 * Single bottom-sheet primitive shared by every modal in the app.
 *
 * Layout structure (web + native):
 *   <Modal>                           — RN modal with slide animation
 *     <View flex:1>                   — full viewport
 *       <Animated.View>               — fading backdrop, position:absolute
 *       <Pressable onClose>           — invisible tap-to-close layer above
 *       <Animated.View align>         — sheet container with drag translateY
 *         <Pressable top drag handle> — captures the pan gesture
 *         <View>                      — actual content
 *
 * Drag-to-dismiss:
 *   The top ~56px of the sheet is a pan-responder drag handle. A
 *   downward drag translates the sheet with the finger and fades
 *   the backdrop in proportion. If the release gesture exceeds the
 *   threshold (120px travel OR 0.5 px/ms velocity) the sheet slides
 *   the rest of the way off-screen and calls `onClose`; otherwise
 *   it springs back to the resting position.
 *
 *   The drag zone is deliberately restricted to the top chrome of
 *   the sheet, not the entire body, so the inner ScrollView (card
 *   details) still handles touches normally.
 */
export function BottomSheet({ visible, onClose, children, align = 'bottom' }: Props) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // `translateY` drives the slide animation driven by the pan
  // gesture. Starts at 0 (fully visible) and the pan responder
  // pushes it positive as the user drags down. On release we
  // either spring back to 0 or animate off-screen and close.
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    // Reset the drag offset every time the sheet becomes visible
    // so a previous "closed by drag" state doesn't leak forward.
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, backdropOpacity, translateY]);

  // Close threshold: pixels of downward travel that count as
  // "commit to dismiss". Anything less springs back up.
  const DISMISS_DISTANCE = 120;
  const DISMISS_VELOCITY = 0.5;

  const panResponder = useRef(
    PanResponder.create({
      // Claim vertical drags greater than 6px so taps on the handle
      // don't get swallowed. Only respond to downward motion.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        // Clamp so the user can't drag the sheet UP past its
        // resting position — only down.
        if (g.dy > 0) {
          translateY.setValue(g.dy);
          // Fade the backdrop as the sheet is dragged away.
          // 0 travel → 1.0 opacity, 400px → 0 opacity.
          const fade = Math.max(0, 1 - g.dy / 400);
          backdropOpacity.setValue(fade);
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldClose = g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
        if (shouldClose) {
          // Animate off-screen, then notify parent. The parent's
          // `visible=false` will trigger the modal to unmount,
          // but we run our own slide first so the motion feels
          // continuous with the drag.
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 800,
              duration: 180,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          // Spring back to rest and restore the backdrop opacity.
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: Platform.OS !== 'web',
              friction: 8,
              tension: 60,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* Fading dim layer */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            opacity: backdropOpacity,
          }}
        />

        {/* Backdrop tap-to-close — sits above the dim layer but
            below the sheet content (z-order via render order). */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Sheet container. Absolutely positioned so we don't
            fight flex layout; animated translateY handles the
            drag-down-to-dismiss gesture. */}
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(align === 'bottom'
              ? { bottom: 0 }
              : { top: 64, bottom: 0 }),
            alignItems: 'center',
            transform: [{ translateY }],
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: align === 'top' ? '#F9FAFB' : '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
              ...(align === 'top' ? { flex: 1 } : {}),
            }}
          >
            {/* Drag handle strip — the top ~44px of the sheet.
                Holds no content but captures the pan gesture so the
                ScrollView below still handles vertical scrolling
                normally. A subtle visual grabber (8px × 48px pill)
                hints that the surface is draggable. */}
            <View
              {...panResponder.panHandlers}
              style={{
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 10,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: '#D1D5DB',
                }}
              />
            </View>

            <SafeAreaView edges={['bottom']} style={align === 'top' ? { flex: 1 } : undefined}>
              {children}
            </SafeAreaView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
