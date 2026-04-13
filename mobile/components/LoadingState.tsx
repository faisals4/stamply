import { View, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

/**
 * Full-screen centered loading spinner. Replaces the repeated
 * inline pattern across 8+ screens:
 *
 *   <View className="flex-1 items-center justify-center">
 *     <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
 *   </View>
 *
 * Drop-in replacement — just `<LoadingState />`.
 */
export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
    </View>
  );
}
