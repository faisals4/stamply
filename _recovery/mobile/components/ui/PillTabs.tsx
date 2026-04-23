import { View, Text, Pressable } from 'react-native';
import { colors } from '../../lib/colors';

type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

/**
 * Shared pill-shaped tab selector. A horizontal row of rounded
 * pills — the active pill fills with brand color, idle pills are
 * transparent with gray text. Used by `BranchSelectionModal` for
 * the delivery/pickup/curbside switcher.
 *
 * The component stretches its children equally across the
 * available width (`flex-1` on each pill), so 2, 3, or 4 tabs
 * all look balanced without manual width math.
 */
export function PillTabs({ tabs, active, onChange }: Props) {
  return (
    <View
      className="flex-row rounded-full bg-gray-100"
      style={{ padding: 4, gap: 4 }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className="flex-1 items-center justify-center rounded-full"
            style={{
              height: 36,
              backgroundColor: isActive ? colors.brand.DEFAULT : 'transparent',
            }}
          >
            <Text
              className="text-xs"
              style={{
                color: isActive ? colors.white : colors.ink.secondary,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
