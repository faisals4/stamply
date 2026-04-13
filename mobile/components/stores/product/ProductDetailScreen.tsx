import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../lib/colors';
import { useCart } from '../../../lib/cart-context';
import { ScreenContainer } from '../../ScreenContainer';
import { ProductHero, PRODUCT_HERO_ASPECT_RATIO } from './ProductHero';
import {
  ProductCompactHeader,
  PRODUCT_COMPACT_HEADER_HEIGHT,
} from './ProductCompactHeader';
import { ProductMeta } from './ProductMeta';
import { NutritionRow } from './NutritionRow';
import { Addons } from './Addons';
import { ProductNotes } from './ProductNotes';
import { ProductCrossSelling } from './ProductCrossSelling';
import { ProductBottomBar } from './ProductBottomBar';
import type { Product, AddonGroup } from '../types';

/**
 * Scroll-y range over which the compact header fades in. Below the
 * start value the bar has zero height and opacity, above the end
 * value it's fully mounted and pinned at the top of the viewport.
 * Tuned so the bar is fully visible by the time the hero image has
 * scrolled off the top edge of a typical phone viewport (hero
 * height ≈ viewport width / 1.4 ≈ 260 px on a 360 px device).
 */
const HERO_COLLAPSE_START = 140;
const HERO_COLLAPSE_END = 220;

type Props = {
  product: Product;
  /** Other products from the same merchant, used to populate the
   *  "add with your order" scroller at the bottom of the screen.
   *  The parent route resolves these either from `crossSellIds`
   *  or from the current product's sibling list. */
  crossSellProducts?: Product[];
  /** Called when the user taps the Add button with a valid
   *  selection. Receives the product, the quantity, the flat addon
   *  selection map, and the notes string. The parent screen wires
   *  this to the real cart. */
  onAddToCart?: (payload: AddToCartPayload) => void;
};

export type AddToCartPayload = {
  product: Product;
  quantity: number;
  addonSelections: Record<string, Record<string, number>>;
  notes: string;
};

/**
 * Full-screen product detail route at `/product/:productId`.
 *
 * Composes the 7 subcomponents in `components/stores/product/`:
 *
 *   ProductCompactHeader — fades in above the page as the user
 *                          scrolls past the hero; shows X + name
 *                          + share
 *   ProductHero          — edge-to-edge image + X/share + sold-out
 *   ProductMeta          — name, price, prep time, description
 *   NutritionRow         — calories, allergens popup, facts popup
 *   Addons               — radio/checkbox/quantity groups with
 *                          built-in shake + parent-driven scroll
 *                          to first invalid group
 *   ProductNotes         — 250-char textarea
 *   ProductCrossSelling  — horizontal "add with your order" scroller
 *   ProductBottomBar     — quantity + Add button with price
 *
 * Validation feedback loop:
 *   1. User taps Add without picking a required option
 *   2. `validate()` marks the groups invalid and bumps `shakeToken`
 *   3. A useEffect watching shakeToken + invalidGroups calls
 *      `measureLayout` on the first invalid group's ref against
 *      the ScrollView, scrolls to it, and the group runs a shake
 *      animation via the bumped token
 */
export function ProductDetailScreen({
  product,
  crossSellProducts = [],
  onAddToCart,
}: Props) {
  const { t } = useTranslation();
  const { addToCart } = useCart();

  // ─── Local state ────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1);
  const [addonSelections, setAddonSelections] = useState<
    Record<string, Record<string, number>>
  >({});
  const [invalidGroups, setInvalidGroups] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  /** Counter bumped each time `validate()` finishes scrolling the
   *  first invalid group into view. Passed down to `Addons` so the
   *  shake animation fires AFTER the scroll settles — not at the
   *  same instant, which would hide the shake motion while the
   *  screen is still panning.
   *
   *  Also re-triggers even if the invalidGroups array is identical
   *  between two failed Add presses, because the counter changes
   *  every time regardless of the selection state. */
  const [shakeToken, setShakeToken] = useState(0);

  /** Counter bumped by `validate()` the instant it finds invalid
   *  groups. A dedicated effect watches this (instead of
   *  `shakeToken`) to drive the programmatic scrollTo, so "scroll"
   *  and "shake" can be sequenced separately — scroll first, then
   *  shake once the view has had time to land. */
  const [scrollToken, setScrollToken] = useState(0);

  const groups: AddonGroup[] = product.addonGroups ?? [];

  // ─── Refs used by the scroll-to-invalid behavior ───────────
  /** The scrollable Animated.ScrollView. Typed as plain ScrollView
   *  via a cast because Animated wraps the node transparently and
   *  `scrollTo` is available on both the wrapper and the underlying
   *  instance. */
  const scrollRef = useRef<ScrollView>(null);

  /** y-offset of the addons container wrapper inside the scroll
   *  content. Measured at runtime via `onLayout` on the wrapper
   *  View that holds `<Addons />`. Adding this to a group's own
   *  y (which is relative to the addons container) produces the
   *  absolute scroll target for that group.
   *
   *  Starts at 0 — the first layout pass updates it as soon as
   *  React mounts the wrapper. No measureLayout involved, which
   *  keeps the behavior consistent across react-native-web and
   *  native platforms. */
  const addonsContainerY = useRef<number>(0);
  const handleAddonsContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      addonsContainerY.current = event.nativeEvent.layout.y;
    },
    []
  );

  /** y-offset of each group RELATIVE to the addons container,
   *  keyed by group id. Populated by each `ShakableGroup`'s
   *  `onLayout` callback threaded through `Addons`. */
  const groupOffsets = useRef<Record<string, number>>({});
  const handleGroupLayout = useCallback((id: string, y: number) => {
    groupOffsets.current[id] = y;
  }, []);

  // ─── Animated scroll position driving the compact header ──
  const scrollYAnim = useRef(new Animated.Value(0)).current;

  const compactHeight = scrollYAnim.interpolate({
    inputRange: [HERO_COLLAPSE_START, HERO_COLLAPSE_END],
    outputRange: [0, PRODUCT_COMPACT_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollYAnim.interpolate({
    inputRange: [HERO_COLLAPSE_START, HERO_COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ─── Addon handlers ─────────────────────────────────────────
  /**
   * Handle a user toggling or adjusting an addon option. Radio
   * groups clear sibling selections in the same group; checkbox
   * and quantity groups update only the target option.
   */
  const handleAddonChange = useCallback(
    (groupId: string, optionId: string, quantity: number) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      setAddonSelections((prev) => {
        if (group.type === 'radio') {
          // Single selection — replace the whole group.
          return { ...prev, [groupId]: { [optionId]: 1 } };
        }
        const next = { ...(prev[groupId] ?? {}) };
        if (quantity <= 0) {
          delete next[optionId];
        } else {
          next[optionId] = quantity;
        }
        return { ...prev, [groupId]: next };
      });

      // Clear the invalid mark as soon as the user edits the
      // group, so the red header goes back to normal immediately.
      if (invalidGroups.includes(groupId)) {
        setInvalidGroups((prev) => prev.filter((id) => id !== groupId));
      }
    },
    [groups, invalidGroups]
  );

  /**
   * Compute the current unit price — base product price plus any
   * addon surcharges multiplied by their quantities. This is the
   * per-unit total shown inside the Add button; the component
   * multiplies by `quantity` for the final displayed number.
   */
  const unitPrice = useMemo(() => {
    const base = product.discountPrice ?? product.price;
    let addonTotal = 0;
    for (const group of groups) {
      const groupSelections = addonSelections[group.id] ?? {};
      for (const [optionId, qty] of Object.entries(groupSelections)) {
        const option = group.options.find((o) => o.id === optionId);
        if (option?.price && qty > 0) addonTotal += option.price * qty;
      }
    }
    return base + addonTotal;
  }, [product, groups, addonSelections]);

  /**
   * Validate that every required addon group has at least one
   * selected option. Returns true when the selection passes.
   *
   * On failure we ONLY bump `scrollToken` here — the scroll effect
   * below picks it up, animates the ScrollView to the first
   * invalid group, and THEN bumps `shakeToken` once the scroll
   * has had time to settle. This ordering (scroll → shake) makes
   * the feedback visible: the user's eyes are already on the
   * right block when the shake fires.
   */
  const validate = useCallback((): boolean => {
    const invalid: string[] = [];
    for (const group of groups) {
      if (!group.required) continue;
      const groupSelections = addonSelections[group.id];
      const hasSelection =
        groupSelections &&
        Object.values(groupSelections).some((qty) => qty > 0);
      if (!hasSelection) invalid.push(group.id);
    }
    setInvalidGroups(invalid);
    if (invalid.length > 0) {
      setScrollToken((prev) => prev + 1);
    }
    return invalid.length === 0;
  }, [groups, addonSelections]);

  /**
   * Scroll effect — fires the moment `scrollToken` ticks after a
   * failed validation. Reads the first invalid group's pre-
   * measured y offset (captured by `onLayout` on each
   * ShakableGroup) and animates the ScrollView to place it just
   * below the compact header.
   *
   * Once the scrollTo has been dispatched, schedules a follow-up
   * 400 ms later that bumps `shakeToken`. 400 ms is the rough
   * settle time for React Native's animated scroll on a typical
   * device — long enough for the panning to finish, short enough
   * that the user still perceives the shake as a direct reaction
   * to their press.
   *
   * Deliberately does NOT rely on `measureLayout` or
   * `findNodeHandle` — both are unreliable against Animated.View
   * on react-native-web, which is what caused the "nothing
   * scrolls on web" regression. Reading cached onLayout
   * coordinates works identically on web and native.
   */
  useEffect(() => {
    if (scrollToken === 0) return;
    if (invalidGroups.length === 0) return;
    const firstId = invalidGroups[0];

    const groupYInContainer = groupOffsets.current[firstId];
    const containerY = addonsContainerY.current;
    const scroll = scrollRef.current;

    const fireShake = () => setShakeToken((prev) => prev + 1);

    // Missing layout data — fall back to shaking in-place so the
    // user still gets SOME feedback.
    if (groupYInContainer === undefined || !scroll) {
      fireShake();
      return;
    }

    const absoluteY = containerY + groupYInContainer;
    // Land the group just below the compact header (which is
    // `PRODUCT_COMPACT_HEADER_HEIGHT` tall once visible) plus a
    // small breathing gap.
    const targetY = Math.max(
      0,
      absoluteY - PRODUCT_COMPACT_HEADER_HEIGHT - 16
    );
    scroll.scrollTo({ y: targetY, animated: true });

    // Delay the shake until the scroll animation has had time
    // to settle on the target group.
    const shakeTimer = setTimeout(fireShake, 400);
    return () => clearTimeout(shakeTimer);
  }, [scrollToken, invalidGroups]);

  const handleAdd = useCallback(() => {
    if (!validate()) return;
    setAddingToCart(true);

    const finalQty = product.hideQuantityControl ? 1 : quantity;
    // Push the product into the shared cart. The current context
    // only tracks `{ productId: quantity }` so we call `addToCart`
    // once per unit — a loop is fine for the small numbers the UI
    // allows (1–99). Addon selections and notes are intentionally
    // NOT persisted here yet; they'll land when the backend cart
    // API ships.
    for (let i = 0; i < finalQty; i++) {
      addToCart(product.id);
    }

    // Optional escape hatch so callers can still observe the add
    // event without reading the cart themselves.
    onAddToCart?.({
      product,
      quantity: finalQty,
      addonSelections,
      notes,
    });

    // Give the user a brief spinner before popping back, matching
    // the reference's 500ms delay.
    setTimeout(() => {
      setAddingToCart(false);
      router.back();
    }, 500);
  }, [validate, addToCart, onAddToCart, product, quantity, addonSelections, notes]);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-page">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        {/* Absolute-positioned compact header — sits above the scroll
            view at the top of the column and fades in via the
            Animated.Value bound below. Rendered OUTSIDE the scroll
            view so it stays pinned to the column top regardless of
            scroll position, matching the StoreDetailScreen pattern. */}
        <Animated.View
          pointerEvents={'box-none'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: compactHeight,
            opacity: compactOpacity,
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          <ProductCompactHeader
            product={product}
            onClose={() => router.back()}
          />
        </Animated.View>

        <Animated.ScrollView
          ref={scrollRef as React.RefObject<any>}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Wire the native scroll position to `scrollYAnim` so the
          // compact header's height + opacity interpolate smoothly.
          // `useNativeDriver: false` because we animate layout
          // height, which the native driver can't touch.
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollYAnim } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <ProductHero product={product} onClose={() => router.back()} />

          <ProductMeta product={product} />

          <NutritionRow product={product} />

          {/* Addons — rendered only when the product has a non-empty
              groups list and isn't flagged `hideAddons`.

              The wrapper View captures its own y-offset inside the
              scroll content via `onLayout`, which the scroll-to-
              invalid effect adds on top of each group's own relative
              y to compute absolute scroll targets. */}
          {!product.hideAddons && groups.length > 0 ? (
            <View
              onLayout={handleAddonsContainerLayout}
              className="mx-5 mt-4 border-t border-gray-100 pt-4"
            >
              <Addons
                groups={groups}
                selections={addonSelections}
                onSelectionChange={handleAddonChange}
                invalidGroups={invalidGroups}
                shakeToken={shakeToken}
                onGroupLayout={handleGroupLayout}
              />
            </View>
          ) : null}

          <View className="mx-5">
            <ProductNotes value={notes} onChange={setNotes} />
          </View>

          <View className="mx-5">
            <ProductCrossSelling
              items={crossSellProducts}
              onItemPress={(item) => {
                // Open the tapped suggestion's detail screen —
                // flat route, not nested under the store.
                router.push(`/product/${item.id}`);
              }}
              onAdd={() => {
                /* Real cart wiring will fire a quick add-to-cart
                   here; for now it's a no-op placeholder. */
              }}
            />
          </View>

          {/* Inline error banner surfaced when validation fails. */}
          {invalidGroups.length > 0 ? (
            <View className="mx-5 mt-4">
              <Text
                className="text-center text-xs"
                style={{ color: colors.state.danger }}
              >
                {t('product_detail.required_error')}
              </Text>
            </View>
          ) : null}
        </Animated.ScrollView>

        <ProductBottomBar
          quantity={quantity}
          onQuantityChange={setQuantity}
          showQuantity={!product.hideQuantityControl}
          unitPrice={unitPrice}
          showPriceInButton
          loading={addingToCart}
          soldOut={!!product.soldOut}
          onAdd={handleAdd}
        />
      </ScreenContainer>
    </SafeAreaView>
  );
}

// Re-export to placate the unused-import linter when PRODUCT_HERO
// constants are only consumed at design time.
export { PRODUCT_HERO_ASPECT_RATIO };
