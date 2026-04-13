import { View, Text } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
};

/**
 * Full-screen centered empty state with title + subtitle. Replaces
 * the repeated inline pattern across 5+ screens:
 *
 *   <View className="flex-1 items-center justify-center px-6">
 *     <Text className="mb-2 text-lg font-bold text-gray-900">...</Text>
 *     <Text className="text-center text-sm leading-6 text-gray-500">...</Text>
 *   </View>
 *
 * Drop-in replacement — `<EmptyState title={...} subtitle={...} />`.
 */
export function EmptyState({ title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="mb-2 text-lg font-bold text-gray-900">{title}</Text>
      <Text className="text-center text-sm leading-6 text-gray-500">
        {subtitle}
      </Text>
    </View>
  );
}
