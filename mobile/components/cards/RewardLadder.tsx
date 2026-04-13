import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { surfaces } from '../../lib/surfaces';

type Reward = {
  id?: number;
  name: string;
  stamps_required: number;
  achieved: boolean;
};

type Props = {
  rewards: Reward[];
};

/**
 * Multi-reward "ladder" rendered on the card details surface — lists
 * every reward tier on the card with achieved ones in primary text +
 * a green ✓ chip, and locked ones in muted text + the stamps still
 * needed.
 *
 * Used by both `CardDetailsSheet` (in the bottom sheet) and the
 * standalone `/app/card/[serial]` screen, so it lives in
 * `components/cards/` as a shared piece. Renders nothing when the
 * card has 0 or 1 reward — call sites can pass the array directly
 * without an outer guard.
 */
export function RewardLadder({ rewards }: Props) {
  const { t } = useTranslation();

  if (!rewards || rewards.length <= 1) return null;

  return (
    <View className={`${surfaces.card} p-4`}>
      <Text className="mb-3 text-sm font-semibold text-gray-900">
        {t('card_detail.rewards')}
      </Text>
      {rewards.map((r, i) => (
        <View
          key={r.id ?? i}
          className={
            'flex-row items-center justify-between py-2 ' +
            (i > 0 ? 'border-t border-gray-100' : '')
          }
        >
          <Text
            className={
              r.achieved
                ? 'text-sm font-medium text-gray-900'
                : 'text-sm text-gray-500'
            }
          >
            {r.name}
          </Text>
          <Text
            className={
              r.achieved
                ? 'text-xs font-semibold text-emerald-600'
                : 'text-xs text-gray-500'
            }
          >
            {r.achieved
              ? t('card_detail.reward_ready_chip')
              : t('card_detail.reward_stamps_count', { count: r.stamps_required })}
          </Text>
        </View>
      ))}
    </View>
  );
}
