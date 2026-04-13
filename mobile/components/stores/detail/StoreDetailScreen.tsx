import { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { useCart } from '../../../lib/cart-context';
import { api, type CardFull } from '../../../lib/api';
import { queryKeys } from '../../../lib/queryKeys';
import { ScreenContainer } from '../../ScreenContainer';
import { StoreHero } from './StoreHero';
import { StoreInfoCard } from './StoreInfoCard';
import { StoreStatsRow } from './StoreStatsRow';
import { CategoryTabs } from './CategoryTabs';
import { CompactHeader, COMPACT_HEADER_HEIGHT } from './CompactHeader';
import { ProductGrid } from './ProductGrid';
import { ProductList } from './ProductList';
import { BottomCartBar } from './BottomCartBar';
import { MyCardsStrip } from './MyCardsStrip';
import { CardDetailsSheet } from '../../cards/CardDetailsSheet';
import type { Store } from '../types';

/**
 * Scroll-y range over which the compact header fades in:
 *   - Below START: fully hidden (height 0, opacity 0).
 *   - Above END:   fully visible (height COMPACT_HEADER_HEIGHT,
 *                  opacity 1).
 *   - In between:  interpolated linearly.
 *
 * Tuned so the compact header is fully visible by the time the
 * hero image has scrolled off the viewport (hero is 240 px tall;
 * we kick off the fade a bit before 200 px to feel responsive).
 */
const HERO_COLLAPSE_START = 120;
const HERO_COLLAPSE_END = 200;

type Props = {
  store: Store;
};

/**
 * Full merchant detail screen — composes the hero, info card, stats
 * row, promo cards, category tabs, and all product sections into
 * one scrollable view with a sticky tabs bar.
 *
 * The ScrollView uses `stickyHeaderIndices` (React Native's built-in
 * sticky-child mechanism) to pin the category tabs + compact header
 * stack when the user scrolls past them. The hero itself is NOT
 * sticky — it scrolls off the top of the viewport entirely.
 *
 * Scroll-driven collapse:
 *   1. The hero (store.cover image + overlay buttons + info card +
 *      stats + promos) scrolls normally.
 *   2. Once the user passes ~120 px of scroll, a solid-white
 *      `CompactHeader` starts fading in ABOVE the sticky tabs bar.
 *      It interpolates from `height: 0` to
 *      `height: COMPACT_HEADER_HEIGHT` with a matching opacity ramp.
 *   3. By ~200 px of scroll, the compact header is fully visible
 *      and the user sees: [compact header] / [category tabs] /
 *      [product list] with the first two pinned at top.
 *
 * Tab interaction (2-way binding with scroll position):
 *   1. Tapping a category tab scrolls the view so the target
 *      section's heading sits just below the sticky header (tabs
 *      + compact bar). The scroll is animated and the active
 *      underline updates in the same tick.
 *   2. As the user scrolls manually, a light-weight scroll-spy
 *      updates the active tab so the underline always reflects the
 *      section currently visible at the top of the content area.
 */
export function StoreDetailScreen({ store }: Props) {
  const localeDirStyle = useLocaleDirStyle();
  const sections = store.menuSections ?? [];
  const [activeTab, setActiveTab] = useState<string>(
    sections[0]?.id ?? ''
  );

  // Fetch the customer's real loyalty cards from the API and
  // filter to this merchant only. No demo fallback — when the
  // user has no cards the strip simply doesn't render.
  const { data: cardsGroups } = useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => (await api.cards()).data,
  });
  const myCards: CardFull[] = useMemo(() => {
    if (!cardsGroups || cardsGroups.length === 0) return [];
    const storeNameLower = store.name.toLowerCase();
    // Match by merchant name (tenant.name ≈ store.name).
    const matched = cardsGroups.flatMap((g) => {
      const tenantName = g.tenant?.name?.toLowerCase() ?? '';
      if (
        tenantName.includes(storeNameLower) ||
        storeNameLower.includes(tenantName)
      ) return g.cards;
      return [];
    });
    return matched;
  }, [cardsGroups, store.name]);

  // Card details sheet — same modal used in the Cards tab.
  const [selectedCard, setSelectedCard] = useState<CardFull | null>(null);

  // Resolve the tenant for the selected card (needed by CardDetailsSheet).
  const selectedTenant = useMemo(() => {
    if (!selectedCard || !cardsGroups) return null;
    for (const g of cardsGroups) {
      if (g.cards.some((c) => c.serial === selectedCard.serial)) {
        return g.tenant;
      }
    }
    return null;
  }, [selectedCard, cardsGroups]);

  // ScrollView ref so tab taps can drive a programmatic scroll to
  // the matching section's y-offset. Typed as ScrollView even
  // though we render <Animated.ScrollView> — Animated wraps the
  // underlying ScrollView and forwards refs transparently.
  const scrollRef = useRef<ScrollView>(null);

  // Animated scroll position driving the compact header fade-in.
  // Hooked to the ScrollView via `Animated.event` below. A plain
  // ref (not state) is the right shape — Animated.Value handles
  // its own update pipeline outside React's render cycle.
  const scrollYAnim = useRef(new Animated.Value(0)).current;

  const compactHeight = scrollYAnim.interpolate({
    inputRange: [HERO_COLLAPSE_START, HERO_COLLAPSE_END],
    outputRange: [0, COMPACT_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  const compactOpacity = scrollYAnim.interpolate({
    inputRange: [HERO_COLLAPSE_START, HERO_COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // y-offset of each section inside the ScrollView's content, keyed
  // by section id. Populated by each section wrapper's `onLayout`
  // callback on first render. A mutable ref (not state) is the
  // right shape here — changes don't need to trigger re-renders.
  const sectionOffsets = useRef<Record<string, number>>({});

  // Measured height of the sticky CategoryTabs bar. Used to offset
  // the programmatic scroll so that the section heading lands just
  // *below* the sticky tabs rather than being hidden behind them.
  // Falls back to 52 (the empirical height) until the first layout
  // pass measures the real value.
  const stickyTabsHeight = useRef<number>(52);

  // Whether the most recent scroll event came from a programmatic
  // scrollTo — used to suppress the scroll-spy briefly so the user's
  // tab tap isn't immediately overwritten by a scroll-spy update
  // landing on a different tab mid-animation.
  const suppressSpyUntil = useRef<number>(0);

  // Cart lives in the app-wide `CartProvider` now so the cart
  // screen (`/cart`) and the product detail screen can mutate the
  // same state. `useCart` throws if the provider isn't mounted,
  // which catches a missing wrapper at the earliest point.
  const { cart, addToCart, removeFromCart } = useCart();

  // Aggregate cart totals, computed from the cart map + the full
  // product list inside the merchant's menu sections. Memoized so
  // the bottom bar and the product cards don't recompute on every
  // scroll tick.
  const { cartCount, cartTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const section of sections) {
      for (const product of section.products) {
        const q = cart[product.id] ?? 0;
        if (q > 0) {
          count += q;
          total += (product.discountPrice ?? product.price) * q;
        }
      }
    }
    return { cartCount: count, cartTotal: total };
  }, [cart, sections]);

  /**
   * Called by each section wrapper once its layout is known.
   * Stores the section's y-offset inside the ScrollView so the tab
   * handler can scroll to it later.
   */
  const handleSectionLayout = useCallback(
    (sectionId: string, event: LayoutChangeEvent) => {
      sectionOffsets.current[sectionId] = event.nativeEvent.layout.y;
    },
    []
  );

  const handleTabsLayout = useCallback((event: LayoutChangeEvent) => {
    stickyTabsHeight.current = event.nativeEvent.layout.height;
  }, []);

  /**
   * Called when the user taps a category tab. Updates the active
   * underline immediately and animates the scroll so the target
   * section's heading lands just below the sticky header stack.
   *
   * By the time the user is tapping a tab, the scroll position is
   * definitely past `HERO_COLLAPSE_END`, so the compact header is
   * fully visible and its height (`COMPACT_HEADER_HEIGHT`) has to
   * be added to the sticky-tabs offset to avoid hiding the target
   * section's heading behind the compact bar.
   */
  const handleTabSelect = useCallback(
    (sectionId: string) => {
      setActiveTab(sectionId);
      const y = sectionOffsets.current[sectionId];
      if (y === undefined) return;
      // Land the section heading a few pixels below the sticky
      // stack so it reads as "tucked under" rather than flush
      // against it.
      const targetY = Math.max(
        0,
        y - stickyTabsHeight.current - COMPACT_HEADER_HEIGHT - 8
      );
      suppressSpyUntil.current = Date.now() + 500;
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    },
    []
  );

  /**
   * Scroll-spy: while the user pans manually, promote whichever
   * section currently sits under the sticky tabs bar to the active
   * tab. Suppressed for 500 ms after a tab tap so the tap's own
   * scroll animation doesn't flicker the underline mid-flight.
   */
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (Date.now() < suppressSpyUntil.current) return;
      const scrollY = event.nativeEvent.contentOffset.y;
      const probeY = scrollY + stickyTabsHeight.current + 16;

      // Find the LAST section whose y-offset is <= probeY. That's
      // the section currently visible at the top of the content
      // area beneath the sticky tabs.
      let current = sections[0]?.id ?? '';
      for (const section of sections) {
        const y = sectionOffsets.current[section.id];
        if (y === undefined) continue;
        if (y <= probeY) current = section.id;
        else break;
      }
      if (current && current !== activeTab) setActiveTab(current);
    },
    [sections, activeTab]
  );

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Same 440px-max column used by every other screen in the
          customer app (login, verify, cards, stores directory,
          settings, card detail). Ensures the merchant detail page
          renders as a phone-shaped column on desktop instead of
          stretching the hero image across a 1920-wide viewport. */}
      <ScreenContainer>
        <Animated.ScrollView
          ref={scrollRef as React.RefObject<any>}
          className="flex-1"
          // Index 4 = the sticky stack (compact header + tabs).
          // Keep this in sync if you reorder the children!
          // Index 3 is always the sticky stack. The MyCardsStrip
          // sits inside index 2's wrapper (together with StoreStatsRow)
          // so it doesn't shift the sticky index.
          stickyHeaderIndices={[3]}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          // Animated.event wires scrollYAnim to the native scroll
          // position. `useNativeDriver: false` is required because
          // we animate a layout height (not a transform/opacity
          // value) which cannot run on the native thread. The
          // `listener` keeps the existing scroll-spy callback
          // firing for the tab-underline sync.
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollYAnim } } }],
            { useNativeDriver: false, listener: handleScroll }
          )}
          // 16ms ≈ 60 fps; any tighter than that and the scroll-spy
          // fires more often than React can re-render the tab bar.
          scrollEventThrottle={16}
        >
          {/* index 0 */}
          <StoreHero store={store} onBack={() => router.back()} />
          {/* index 1 */}
          <StoreInfoCard store={store} />
          {/* index 2 — Stats row + loyalty cards strip bundled in
              one View so the sticky index stays fixed at 3. The
              cards strip sits where the promo/coupon cards used to
              be — below the delivery stats, above the category
              tabs. Hidden when the customer has no cards. */}
          <View>
            <StoreStatsRow store={store} />
            <MyCardsStrip
              cards={myCards}
              onCardPress={(serial) => {
                const card = myCards.find((c) => c.serial === serial);
                if (card) setSelectedCard(card);
              }}
            />
          </View>
          {/* index 3 — STICKY STACK — compact header fades in above
              the tabs as scrollY crosses the hero collapse range.
              Both elements pin to the top of the viewport together
              once this wrapper reaches the scroll ceiling. */}
          <View>
            <Animated.View
              style={{
                height: compactHeight,
                opacity: compactOpacity,
                overflow: 'hidden',
              }}
            >
              <CompactHeader store={store} onBack={() => router.back()} />
            </Animated.View>
            <View onLayout={handleTabsLayout}>
              <CategoryTabs
                sections={sections}
                active={activeTab}
                onSelect={handleTabSelect}
              />
            </View>
          </View>

          {/* All menu sections render below the sticky tabs. Each
              wrapper measures its own y-offset via onLayout so tab
              taps can scroll-to the matching section. */}
          {sections.map((section) => (
            <View
              key={section.id}
              onLayout={(e) => handleSectionLayout(section.id, e)}
            >
              <Text
                style={localeDirStyle}
                className="mt-4 px-4 text-start text-base font-bold text-gray-900"
              >
                {section.name}
              </Text>
              {section.layout === 'grid' ? (
                <ProductGrid
                  section={section}
                  cart={cart}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onProductPress={(id) => router.push(`/product/${id}`)}
                />
              ) : (
                <ProductList
                  section={section}
                  cart={cart}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onProductPress={(id) => router.push(`/product/${id}`)}
                />
              )}
            </View>
          ))}
        </Animated.ScrollView>

        {/* BottomCartBar sits INSIDE ScreenContainer so its
            `absolute bottom/start/end` insets are relative to the
            440px column rather than the full viewport — otherwise
            on desktop the bar would span the entire window while
            the rest of the page is clamped.

            The bar is mounted only when the cart has at least one
            item (it returns `null` internally when cartCount is 0).
            No more "add N SAR to reach the minimum order" nudge. */}
        <BottomCartBar cartCount={cartCount} cartTotal={cartTotal} />
      </ScreenContainer>

      {/* Card details modal — same component used in the Cards tab.
          Opens when the user taps a card in the MyCardsStrip above. */}
      <CardDetailsSheet
        card={selectedCard}
        tenant={selectedTenant}
        visible={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
      />
    </SafeAreaView>
  );
}
