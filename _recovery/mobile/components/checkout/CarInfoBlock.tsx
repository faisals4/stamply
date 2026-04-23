import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import type { CarInfo } from './branch-data';

type Props = {
  car: CarInfo;
  onChange: () => void;
};

/**
 * Car info card shown in the checkout when `orderType === 'curbside'`.
 * Displays the selected car's brand, color swatch, plate number,
 * and a "تغيير" button to open the car selection modal.
 *
 *   [ color-swatch ]  [ brand name ]  ...  [ تغيير ]
 *                     [ plate       ]
 */
export function CarInfoBlock({ car, onChange }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white p-4" style={{ gap: 12 }}>
      {/* Color swatch */}
      <View
        className="rounded-lg"
        style={{ width: 24, height: 24, backgroundColor: car.color }}
      />

      {/* Brand + plate */}
      <View className="flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-medium text-gray-900"
        >
          {car.brand}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-0.5 text-start text-xs text-gray-500"
        >
          {car.plate}
        </Text>
      </View>

      {/* Change button */}
      <Pressable
        onPress={onChange}
        className="rounded-xl border border-gray-200 px-3 py-1.5"
      >
        <Text className="text-xs text-gray-700">
          {t('checkout.change')}
        </Text>
      </Pressable>
    </View>
  );
}
