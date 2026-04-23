import { View, Pressable } from 'react-native';
import { colors } from '../../lib/colors';
import type { LucideIcon } from 'lucide-react-native';

type Segment<T extends string> = {
  key: T;
  icon: LucideIcon;
};

type Props<T extends string> = {
  segments: Segment<T>[];
  active: T;
  onChange: (key: T) => void;
};

/**
 * iOS-style segmented control with icon buttons.
 * Pill-shaped container with a light gray background,
 * active segment highlighted with brand tint.
 *
 * Used for view toggles (list/grid, list/map, etc.).
 */
export function SegmentedToggle<T extends string>({ segments, active, onChange }: Props<T>) {
  return (
    <View className="flex-row items-center rounded-full bg-gray-100 p-1">
      {segments.map((seg) => {
        const Icon = seg.icon;
        const isActive = seg.key === active;
        return (
          <Pressable
            key={seg.key}
            onPress={() => onChange(seg.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={
              isActive
                ? 'h-8 w-10 items-center justify-center rounded-full border border-brand-100 bg-brand-50'
                : 'h-8 w-10 items-center justify-center rounded-full'
            }
          >
            <Icon
              color={isActive ? colors.brand.DEFAULT : colors.ink.tertiary}
              size={16}
              strokeWidth={2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
