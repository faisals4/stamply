import { useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { CardVisual } from '../../cards/CardVisual';
import type { CardFull } from '../../../lib/api';

/**
 * Render width for each compact card tile inside the horizontal
 * scroller. The CardVisual renders at this width and its internal
 * aspect ratio determines the height. Smaller = shorter cards.
 */
const CARD_WIDTH = 220;

type Props = {
  cards: CardFull[];
  onCardPress: (serial: string) => void;
};

/**
 * Horizontal "بطاقاتي" strip shown on the store detail screen
 * between the stats row and the sticky category tabs. Displays
 * compact `CardVisual` tiles for every loyalty card the customer
 * holds at this merchant.
 *
 * Appearance animation: when the cards load (from API or demo
 * fallback), the strip fades in + grows from height 0 over 400ms
 * so it doesn't pop into the layout abruptly.
 *
 * Hidden entirely when cards is empty — returns null, no space.
 */
export function MyCardsStrip({ cards, onCardPress }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasCards = cards.length > 0;

  // Animate in when cards arrive.
  useEffect(() => {
    if (hasCards) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [hasCards, fadeAnim]);

  if (!hasCards) return null;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        // Scale maxHeight from 0 → 300 so surrounding content
        // pushes down smoothly instead of jumping.
        maxHeight: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 300],
        }),
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      <Text
        style={localeDirStyle}
        className="mb-2 px-4 text-start text-sm font-bold text-gray-900"
      >
        {t('store_detail.my_cards_title')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {cards.map((card) => {
          const title = card.name ?? '—';
          const firstReward = card.all_rewards?.[0];
          const stampsRequired =
            firstReward?.stamps_required ?? card.stamps_required ?? 10;

          return (
            <Pressable
              key={card.serial}
              onPress={() => onCardPress(card.serial)}
              style={{ width: CARD_WIDTH }}
            >
              <CardVisual
                design={card.design}
                title={title}
                collectedStamps={card.stamps_count}
                customerName={card.customer_name ?? ''}
                serial={card.serial}
                stampsRequired={stampsRequired}
                compact
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
