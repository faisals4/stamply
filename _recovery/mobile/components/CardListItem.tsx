import { View, Text, Pressable } from 'react-native';
import { CardSummary } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { shadows } from '../lib/shadows';

type Props = {
  card: CardSummary;
  onPress: () => void;
};

/**
 * Compact list row for the cards screen. Shows the same brand colour
 * language as the full CardVisual on the detail page, so the list
 * feels like a stack of the real cards rather than a neutral list:
 *
 *   - background uses the card template's brand background colour
 *   - progress bar fills with the activeStamp colour
 *   - title and secondary text use the foreground colour
 *
 * All directional styling is wrapped in `direction: 'ltr'` so the
 * progress bar always fills from the start of the reading flow inside
 * the coloured chip, regardless of the app's current locale. This
 * matches how the mobile CardVisual (and Apple Wallet) behave.
 */
export function CardListItem({ card, onPress }: Props) {
  const { t } = useTranslation();
  const total = card.stamps_required ?? card.design?.stampsCount ?? 0;
  const count = Math.min(card.stamps_count, total || card.stamps_count);
  const progress = total > 0 ? Math.min(count / total, 1) : 0;

  const colors = card.design?.colors ?? {
    background: '#FEF3C7',
    foreground: '#78350F',
    stampsBackground: '#FCD34D',
    activeStamp: '#78350F',
    inactiveStamp: '#FDE68A',
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        // Shared card shadow — see mobile/lib/shadows.ts.
        ...shadows.card,
      }}
    >
      <View style={{ direction: 'ltr' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.foreground,
              fontSize: 15,
              fontWeight: '600',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {card.name ?? '—'}
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 13,
              fontVariant: ['tabular-nums'],
              opacity: 0.85,
            }}
          >
            {total > 0 ? `${count}/${total}` : `${card.stamps_count} ${t('cards.stamps')}`}
          </Text>
        </View>
        {total > 0 && (
          <View
            style={{
              marginTop: 10,
              height: 6,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: colors.stampsBackground,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: colors.activeStamp,
                borderRadius: 999,
              }}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}
