import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Store as StoreIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { api, CardFull, Tenant } from '../../lib/api';
import { CardVisual } from '../../components/cards/CardVisual';
import { CardDetailsSheet } from '../../components/cards/CardDetailsSheet';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PageHeader } from '../../components/PageHeader';
import { colors } from '../../lib/colors';
import { queryKeys } from '../../lib/queryKeys';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { HeroBannerSlider } from '../../components/home/HeroBannerSlider';

/**
 * Cards screen — Apple Wallet-style stack of every loyalty card the
 * customer holds across every Stamply merchant.
 *
 * Layout model (how the "stacked cards" effect is built):
 *
 *   - Cards are flattened into a single list (Apple Wallet doesn't
 *     group by issuer, so neither do we).
 *   - Each card is rendered at its FULL height, absolutely positioned
 *     inside a relative container. We do NOT clip cards at PEEK
 *     height — instead we rely on the NEXT card visually covering
 *     the bottom of the previous one via z-index stacking. This is
 *     the key difference from a naive implementation: if you clip
 *     each card to a fixed 96px wrapper, the bottom of the peek is
 *     a straight line. By letting cards render in full and layering
 *     them, the peek's bottom edge is the rounded TOP corner of the
 *     next card — giving the real "stacked cards" look instead of a
 *     "ribbon" look.
 *   - Stack positions: card[i] sits at `top = i * PEEK`. Because each
 *     card is FULL tall and `top` increments by only PEEK, every card
 *     overlaps the previous one by `FULL - PEEK` pixels. The next
 *     card's zIndex is always higher, so it visually covers the
 *     previous card's body below y = (i+1) * PEEK.
 *   - The LAST card is special: nothing covers it, so its full body
 *     is visible — same behavior as the bottom-most pass in Apple
 *     Wallet.
 *   - When a card is expanded, cards after it slide DOWN by
 *     `FULL - PEEK` so the expanded card's body is no longer covered.
 *     Cards before the expanded one stay put.
 *
 * Interaction model:
 *   - Tap a peek → that card expands (collapses any previously
 *     expanded card).
 *   - Tap the expanded card → opens the existing `CardDetailsSheet`
 *     bottom sheet (keeps wallet badges + activity timeline + reward
 *     ladder where they already live).
 *   - Tap another peek → switches expansion to the new card.
 *
 * Animation:
 *   - Smooth `top` transitions are done via the web `transition` CSS
 *     property injected via inline style. react-native-web passes
 *     unknown style keys through to the DOM, so this is free on web.
 *     On native the property is a no-op (cards snap between states);
 *     swapping to Reanimated is a native-ship follow-up.
 */

// Layout constants for the stack.
//
// PEEK_HEIGHT — vertical offset between successive cards in the
// stack, i.e. how much of each card is visible under the next one.
// CardVisual's header runs exactly 56px (paddingTop 16 + logo 28 +
// paddingBottom 12), after which the stamps strip begins. We pick
// 68 so the peek shows the full header (logo + title + reward
// counter) plus a 12-pixel hint of the stamps-strip background color,
// giving the "card continues below" feel without cutting stamp
// cells in half. Going lower (56) is even cleaner but loses the
// color-band hint; going higher (>96) cuts stamp cells and looks
// ribbon-like instead of card-like.
//
// FULL_HEIGHT — approximate natural height of a compact CardVisual.
// Used for container sizing + the push-down delta when a card is
// expanded. Tuning this slightly off-real is OK — it only affects
// how much empty space sits below an expanded card before the next
// peek.
const PEEK_HEIGHT = 68;
const FULL_HEIGHT = 240;

type FlatCard = { card: CardFull; tenant: Tenant | null };

export default function CardsScreen() {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<{ card: CardFull; tenant: Tenant | null } | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => (await api.cards()).data,
    refetchInterval: 5000, // live updates mirror the web /i/{serial} page
  });
  // Cards list fix note: the query above returns only active,
  // non-expired, non-deleted cards — the filter lives on the backend
  // in CustomerCardsController::index() so no client-side filter is
  // needed here.

  // Flatten {tenant: [cards]} groups into a single sequence. Apple
  // Wallet doesn't group by issuer, so neither do we — each card
  // already shows its own brand logo + title inside the CardVisual.
  const flatCards: FlatCard[] = (data ?? []).flatMap((group) =>
    group.cards.map((card) => ({ card, tenant: group.tenant })),
  );

  /**
   * Unified tap handler for every card in the stack. `region` tells
   * us WHERE on the card the user tapped — either the "header"
   * (the top PEEK_HEIGHT pixels that stay visible in the stack) or
   * the "body" (everything below that is only reachable once the
   * card is expanded).
   *
   * Interaction model:
   *   - Card is collapsed + user taps ANY region → expand it.
   *     (In collapsed state only the header is visible, so every tap
   *     naturally falls in the header region anyway.)
   *   - Card is already expanded + user taps the header → collapse
   *     it back to the stack. The header doubles as a toggle.
   *   - Card is already expanded + user taps the body → open the
   *     details bottom sheet with wallet badges + activity timeline
   *     + reward ladder.
   *   - User taps a different card while another is expanded → the
   *     new card becomes the expanded one (any region).
   */
  const handleCardPress = (
    index: number,
    item: FlatCard,
    region: 'header' | 'body',
  ) => {
    if (expandedIndex !== index) {
      setExpandedIndex(index);
      return;
    }
    if (region === 'header') {
      setExpandedIndex(null);
    } else {
      setSelected(item);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScreenContainer>
        <PageHeader title={t('cards.title')} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand.DEFAULT}
            />
          }
        >
          <HeroBannerSlider />

            {/* Loyalty stores CTA block */}
            <Pressable
              onPress={() => router.push('/(tabs)/loyalty-stores' as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 16,
                marginBottom: 12,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#f3f0ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StoreIcon color="#8B52F6" size={22} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1f2937' }}>
                  {t('cards.loyalty_stores_title')}
                </Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {t('cards.loyalty_stores_subtitle')}
                </Text>
              </View>
              {i18n.dir() === 'rtl'
                ? <ChevronLeft color="#d1d5db" size={20} />
                : <ChevronRight color="#d1d5db" size={20} />
              }
            </Pressable>

            {isLoading ? (
              <LoadingState />
            ) : flatCards.length === 0 ? (
              <EmptyState
                title={t('cards.empty_title')}
                subtitle={t('cards.empty_subtitle')}
              />
            ) : (
              <CardStack
                cards={flatCards}
                expandedIndex={expandedIndex}
                onCardPress={handleCardPress}
              />
            )}
          </ScrollView>
      </ScreenContainer>

      <CardDetailsSheet
        card={selected?.card ?? null}
        tenant={selected?.tenant ?? null}
        visible={selected !== null}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

/* ─── Stack + stacked card item ──────────────────────────────────── */

/**
 * Compute the `top` coordinate of card `i` inside the absolutely-
 * positioned stack, given which card (if any) is currently expanded.
 *
 *   - No expansion: cards are placed at `i * PEEK` so each peek sits
 *     right under the previous one's peek.
 *   - Expansion: cards up to and including the expanded one keep
 *     their stack positions. Cards after the expanded one are pushed
 *     down by the delta (`FULL - PEEK`) so they don't overlap the
 *     expanded card's body.
 */
function computeCardTop(index: number, expandedIndex: number | null): number {
  if (expandedIndex === null || index <= expandedIndex) {
    return index * PEEK_HEIGHT;
  }
  return expandedIndex * PEEK_HEIGHT + FULL_HEIGHT + (index - expandedIndex - 1) * PEEK_HEIGHT;
}

/**
 * Total vertical space the stack needs. The last card is always
 * rendered at FULL height (nothing covers its bottom), so the
 * container has to reach all the way down to `top(last) + FULL`.
 */
function computeStackHeight(expandedIndex: number | null, total: number): number {
  if (total === 0) return 0;
  const lastTop = computeCardTop(total - 1, expandedIndex);
  return lastTop + FULL_HEIGHT;
}

function CardStack({
  cards,
  expandedIndex,
  onCardPress,
}: {
  cards: FlatCard[];
  expandedIndex: number | null;
  onCardPress: (index: number, item: FlatCard, region: 'header' | 'body') => void;
}) {
  const total = cards.length;
  const containerHeight = computeStackHeight(expandedIndex, total);

  return (
    <View
      style={{
        position: 'relative',
        width: '100%',
        height: containerHeight,
        // Smooth the container resize on web so the ScrollView
        // content doesn't snap when a card expands/collapses.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ transition: 'height 320ms cubic-bezier(0.2, 0.8, 0.2, 1)' } as any),
      }}
    >
      {cards.map((item, i) => {
        const top = computeCardTop(i, expandedIndex);
        const isExpanded = expandedIndex === i;
        return (
          <StackedCard
            key={item.card.serial}
            item={item}
            top={top}
            isExpanded={isExpanded}
            zIndex={i}
            onPress={(region) => onCardPress(i, item, region)}
          />
        );
      })}
    </View>
  );
}

function StackedCard({
  item,
  top,
  isExpanded,
  zIndex,
  onPress,
}: {
  item: FlatCard;
  top: number;
  isExpanded: boolean;
  zIndex: number;
  onPress: (region: 'header' | 'body') => void;
}) {
  // Route the tap to the right region based on WHERE inside the card
  // the user touched:
  //   - `locationY < PEEK_HEIGHT` → header region (the portion that
  //     stays visible when the card is collapsed in the stack).
  //     Tapping here is the "collapse toggle" once the card is open.
  //   - Otherwise → body region (the stamps strip and anything below
  //     it, only reachable when the card is expanded). Tapping here
  //     is the "open details" affordance.
  //
  // In the collapsed stack state only the header is reachable
  // visually, so `locationY` will always fall in the header region
  // — the parent handler treats any tap as "expand" in that case.
  const handlePress = (event: GestureResponderEvent) => {
    const y = event.nativeEvent.locationY;
    onPress(y < PEEK_HEIGHT ? 'header' : 'body');
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        // Later cards paint on top of earlier ones so their rounded
        // top corners visually cover the bottom of the previous
        // card — no height clipping, no flat-cut bottom, the peek
        // boundary is literally the next card's rounded top.
        zIndex,
        // Web-only smooth slide when `top` changes on expand/collapse.
        // No height transition because cards always render at their
        // natural full height — only their vertical position moves.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          transition: 'top 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        } as any),
      }}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={item.card.name ?? item.tenant?.name ?? ''}
        accessibilityState={{ expanded: isExpanded }}
      >
        <CardVisual
          design={item.card.design}
          title={item.card.name ?? item.tenant?.name ?? ''}
          collectedStamps={item.card.stamps_count}
          customerName={item.card.customer_name ?? ''}
          serial={item.card.serial}
          stampsRequired={
            item.card.all_rewards?.[0]?.stamps_required ??
            item.card.stamps_required ??
            undefined
          }
          brandLogoUrl={item.tenant?.logo_url ?? null}
          compact
        />
      </Pressable>
    </View>
  );
}
