import { View, Text, Pressable } from 'react-native';
import { Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { RadioPin } from '../ui/RadioPin';
import type { CheckoutTimeSelection } from '../../lib/checkout-context';

type Props = {
  time: CheckoutTimeSelection;
  onSelectAsap: () => void;
  onOpenScheduler: () => void;
};

/**
 * Two-row picker for when the order should fulfil:
 *
 *   [ (●) في أسرع وقت (10 دقائق) ]
 *   [ (○) لوقت لاحق                                    ← ]
 *                                                         ^ opens modal
 *
 * The two rows share the same radio-card styling. Tapping the
 * first row switches the time to `asap`. Tapping the second row
 * opens the `TimePickerModal` via `onOpenScheduler`; once the
 * parent commits a scheduled time, the second row's subtitle
 * updates to show the chosen day + slot.
 */
export function TimeSelectionBlock({
  time,
  onSelectAsap,
  onOpenScheduler,
}: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const EndChevron = isRTL ? ChevronLeft : ChevronRight;

  const isAsap = time.mode === 'asap';
  const scheduledLabel =
    time.mode === 'scheduled' ? `${time.day} — ${time.slot}` : null;

  return (
    <View className="mx-4" style={{ gap: 10 }}>
      <Text
        style={localeDirStyle}
        className="text-start text-sm font-bold text-gray-900"
      >
        {t('checkout.time_block_title')}
      </Text>

      <View style={{ gap: 8 }}>
        <TimeRow
          isSelected={isAsap}
          icon={<Clock color={colors.ink.secondary} size={16} strokeWidth={2} />}
          title={t('checkout.time_asap_title')}
          subtitle={t('checkout.time_asap_subtitle')}
          onPress={onSelectAsap}
        />
        <TimeRow
          isSelected={!isAsap}
          icon={<Calendar color={colors.ink.secondary} size={16} strokeWidth={2} />}
          title={t('checkout.time_scheduled_title')}
          subtitle={
            scheduledLabel ?? (t('checkout.time_scheduled_subtitle') as string)
          }
          onPress={onOpenScheduler}
          trailingIcon={
            <EndChevron
              color={colors.ink.tertiary}
              size={18}
              strokeWidth={2}
            />
          }
        />
      </View>
    </View>
  );
}

/**
 * Single radio-style row used by both time options. Stateless —
 * the parent decides which row is currently selected.
 */
function TimeRow({
  isSelected,
  icon,
  title,
  subtitle,
  onPress,
  trailingIcon,
}: {
  isSelected: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailingIcon?: React.ReactNode;
}) {
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-2xl border bg-white p-3"
      style={{
        gap: 12,
        borderColor: isSelected ? colors.brand.DEFAULT : colors.ink.border,
      }}
    >
      <RadioPin selected={isSelected} />

      {icon}

      <View className="flex-1">
        <Text
          style={localeDirStyle}
          className="text-start text-sm font-medium text-gray-900"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={localeDirStyle}
          className="mt-0.5 text-start text-xs text-gray-500"
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {trailingIcon}
    </Pressable>
  );
}
