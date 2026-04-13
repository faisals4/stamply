import { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

/**
 * Centers a column of content at a maximum width of 440 CSS pixels.
 *
 * On a phone this is a no-op — the viewport is already narrower than
 * 440 so the inner view fills the width. On a desktop browser the
 * cards, the login/verify forms, the settings list, and the bottom
 * sheets are all clamped to a phone-shaped column so the app looks
 * like a phone app and not a 1920-wide stretched layout.
 *
 * We apply the constraint via `maxWidth + alignSelf: center` instead
 * of Tailwind's `mx-auto` because NativeWind's mx-auto is unreliable
 * on React Native Web when the parent is a flex container — it
 * compiles to `margin: auto` which has no effect on flex children
 * in the main axis.
 */
export function ScreenContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
