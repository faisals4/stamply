import { View, Text } from 'react-native';
import { Gift } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../lib/colors';

type Props = {
  /** Number of complete reward cycles the customer can claim. */
  count: number;
  /** Name of the first reward — appears in the subtitle copy. */
  rewardName?: string;
};

/**
 * Green "ready to redeem" callout shown above the wallet button on
 * both `CardDetailsSheet` and the standalone `/app/card/[serial]`
 * screen. Single source so any future copy/visual change happens in
 * one place.
 *
 * The headline picks one of three i18n keys to handle Arabic
 * singular/dual/plural — Arabic doesn't reduce to a simple
 * `{{count}}` substitution the way English does, so the choice
 * happens here in code rather than via i18next plurals.
 */
export function RewardReadyBanner({ count, rewardName }: Props) {
  const { t } = useTranslation();

  if (count <= 0) return null;

  const headlineKey =
    count === 1 ? 'card_detail.ready_one'
    : count === 2 ? 'card_detail.ready_two'
    : 'card_detail.ready_many';
  const headline = t(headlineKey, { count });
  const subtitle = t('card_detail.ready_subtitle', {
    reward: rewardName ?? t('card_detail.ready_default_reward'),
  });

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
        <Gift color={colors.state.success} size={22} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-emerald-900">{headline}</Text>
        <Text className="mt-0.5 text-2xs text-emerald-800/80">{subtitle}</Text>
      </View>
    </View>
  );
}
