import { View, Text } from 'react-native';
import { Rows2, Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SegmentedToggle } from '../ui/SegmentedToggle';
import type { StoresViewMode } from './types';

type Props = {
  view: StoresViewMode;
  onChangeView: (next: StoresViewMode) => void;
};

const SEGMENTS: { key: StoresViewMode; icon: typeof Rows2 }[] = [
  { key: 'grid', icon: Rows2 },
  { key: 'list', icon: Menu },
];

/**
 * Section title row above the store list — shows "كل المتاجر" /
 * "All stores" and a grid/list view toggle on the inline-end.
 */
export function StoresSectionHeader({ view, onChangeView }: Props) {
  const { t } = useTranslation();

  return (
    <View className="mx-4 mb-3 flex-row items-center justify-between">
      <Text className="text-xl font-bold text-gray-900">
        {t('stores.section_all')}
      </Text>
      <SegmentedToggle segments={SEGMENTS} active={view} onChange={onChangeView} />
    </View>
  );
}
