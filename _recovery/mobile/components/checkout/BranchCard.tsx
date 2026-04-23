import { View, Text, Pressable } from 'react-native';
import { Check, Clock, Phone, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { StatusBadge } from '../StatusBadge';
import type { Branch, BranchStatus } from './branch-data';

type Props = {
  branch: Branch;
  isSelected: boolean;
  onSelect: () => void;
  onClockPress?: () => void;
  onPhonePress?: () => void;
  onMapPress?: () => void;
};

/**
 * Single branch selection card — a bordered row with:
 *
 *   [icons: clock phone map]  ...  [name ✓ (if selected)]
 *                                  [يبعد عنك 3.28 كم]
 *                                  [مفتوح] / [مشغول] / [مغلق]
 *                                  [الطلب المسبق متاح]
 *
 * The card is Pressable — tapping anywhere on it fires `onSelect`.
 * The three mini icons at inline-start have their own press
 * handlers that open clock/phone/map features independently.
 *
 * Mirrors `branch-card.tsx` + `branch-selection-item.tsx` from
 * orders4 but merged into one component for simplicity since the
 * two subcomponents were only ever used together.
 */
export function BranchCard({
  branch,
  isSelected,
  onSelect,
  onClockPress,
  onPhonePress,
  onMapPress,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <Pressable
      onPress={onSelect}
      className="flex-row items-center rounded-2xl border bg-white p-3"
      style={{
        gap: 12,
        borderColor: isSelected ? colors.brand.DEFAULT : colors.ink.border,
        backgroundColor: isSelected ? 'rgba(235, 89, 46, 0.04)' : colors.white,
      }}
    >
      {/* Inline-start (right in RTL): branch info.
          First in JSX so flex-row places it at inline-start. */}
      <View className="flex-1" style={{ gap: 4 }}>
        {/* Name + optional checkmark. The check sits BEFORE the name
            in JSX so flex-row places it at inline-start (RIGHT in
            RTL) — directly next to the branch name, not drifting
            to the inline-end where the action icons live. */}
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {isSelected ? (
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                backgroundColor: colors.brand.DEFAULT,
              }}
            >
              <Check color={colors.white} size={12} strokeWidth={2.5} />
            </View>
          ) : null}
          <Text
            style={localeDirStyle}
            className="flex-1 text-start text-sm font-medium text-gray-900"
            numberOfLines={1}
          >
            {branch.name}
          </Text>
        </View>

        {/* Distance. */}
        <Text
          style={localeDirStyle}
          className="text-start text-xs text-gray-500"
        >
          {t('branch.distance_from', { distance: branch.distance })}
        </Text>

        {/* Status badge. */}
        <BranchStatusBadge
          status={branch.status}
          busyUntil={branch.busyUntil}
          nextOpenTime={branch.nextOpenTime}
        />

        {/* Pre-order badge (only when open). */}
        {branch.preOrderAvailable && branch.status === 'open' ? (
          <View className="self-start rounded-full bg-gray-100 px-2 py-0.5">
            <Text className="text-3xs text-gray-500">{t('branch.preorder_available')}</Text>
          </View>
        ) : null}
      </View>

      {/* Inline-end (left in RTL): 3 action icons.
          Second in JSX so flex-row places it at inline-end. */}
      <View className="flex-row" style={{ gap: 8 }}>
        <IconButton onPress={onMapPress}>
          <MapPin color={colors.ink.tertiary} size={16} strokeWidth={2} />
        </IconButton>
        <IconButton onPress={onPhonePress}>
          <Phone color={colors.ink.tertiary} size={16} strokeWidth={2} />
        </IconButton>
        <IconButton onPress={onClockPress}>
          <Clock color={colors.ink.tertiary} size={16} strokeWidth={2} />
        </IconButton>
      </View>
    </Pressable>
  );
}

/**
 * Status badge — three color variants matching the reference:
 *   open  → green
 *   busy  → orange (with optional "until" time)
 *   closed → red (with optional "opens at" time)
 */
function BranchStatusBadge({
  status,
  busyUntil,
  nextOpenTime,
}: {
  status: BranchStatus;
  busyUntil?: string;
  nextOpenTime?: string;
}) {
  const { t } = useTranslation();

  if (status === 'open') {
    return <StatusBadge label={t('branch.status_open')} variant="success" />;
  }
  if (status === 'busy') {
    const label = busyUntil
      ? `${t('branch.status_busy')} – ${t('branch.available_at')} ${busyUntil}`
      : t('branch.status_busy');
    return <StatusBadge label={label} variant="warning" />;
  }
  if (status === 'closed') {
    const label = nextOpenTime
      ? `${t('branch.status_closed')} – ${t('branch.opens_at')} ${nextOpenTime}`
      : t('branch.status_closed');
    return <StatusBadge label={label} variant="danger" />;
  }
  return null;
}

/**
 * Small circular icon tap target used for the clock/phone/map
 * actions inside the branch card. Sized at 24×24 so it's tappable
 * without being visually heavy.
 */
function IconButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        onPress?.();
      }}
      hitSlop={6}
      className="items-center justify-center"
      style={{ width: 24, height: 24 }}
    >
      {children}
    </Pressable>
  );
}
