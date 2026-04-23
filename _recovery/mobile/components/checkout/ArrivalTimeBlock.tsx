import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../lib/colors';

type Props = {
  selectedTime: string | null;
  onChange: (time: string) => void;
  options?: string[];
};

const DEFAULT_OPTIONS = ['15', '30', '45', '60'];

/**
 * Estimated arrival time block — shown for curbside orders only.
 * A centered title + a row of time pills (15/30/45/60 دقيقة).
 * The selected pill fills with brand color, idle pills have a
 * gray border.
 */
export function ArrivalTimeBlock({
  selectedTime,
  onChange,
  options = DEFAULT_OPTIONS,
}: Props) {
  const { t } = useTranslation();

  return (
    <View className="mx-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-center text-sm text-gray-900">
        {t('checkout.arrival_time_title')}
      </Text>
      <View
        className="flex-row items-center justify-center"
        style={{ gap: 8 }}
      >
        {options.map((time) => {
          const isActive = selectedTime === time;
          return (
            <Pressable
              key={time}
              onPress={() => onChange(time)}
              className="items-center justify-center rounded-full border px-4"
              style={{
                height: 36,
                borderColor: isActive
                  ? colors.brand.DEFAULT
                  : colors.ink.border,
                backgroundColor: isActive
                  ? colors.brand.DEFAULT
                  : 'transparent',
              }}
            >
              <Text
                className="text-xs"
                style={{
                  color: isActive ? colors.white : colors.ink.primary,
                }}
              >
                {time} {t('checkout.arrival_time_unit')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
