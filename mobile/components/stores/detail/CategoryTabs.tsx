import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Menu } from 'lucide-react-native';
import { colors } from '../../../lib/colors';
import type { MenuSection } from '../types';

type Props = {
  sections: MenuSection[];
  active: string;
  onSelect: (sectionId: string) => void;
};

// Ease-out quart — same curve used by `CategoryChips` on the stores
// index so both horizontal chip rows in the app feel identical when
// auto-centering. Strong deceleration with a soft tail.
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function findScrollableX(el: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = el?.parentElement ?? null;
  while (current) {
    const overflowX = getComputedStyle(current).overflowX;
    if (overflowX === 'scroll' || overflowX === 'auto') return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Horizontal scrolling category tabs bar anchored below the promo
 * cards. When the parent ScrollView scrolls past this element it
 * becomes sticky (via `stickyHeaderIndices` on the parent) and pins
 * to the top of the viewport for the rest of the scroll.
 *
 * Stable-position rules (do not break these — they're load-bearing
 * for avoiding vertical jitter as the active tab changes):
 *
 *   1. Every tab Pressable has the SAME vertical padding, so the
 *      row height stays constant whichever tab is active.
 *   2. The active underline is rendered with `position: absolute`
 *      pinned to `bottom: 0` of the Pressable, so toggling it on
 *      and off does not add or remove layout height — the non-
 *      active tabs have the same bounding box as the active one.
 *   3. Both active AND idle labels share the SAME font weight
 *      (bold) so the text width is byte-identical between states.
 *      Only the color flips (ink.primary → ink.secondary). This
 *      prevents the ~1 px reflow that happens when switching from
 *      `font-medium` to `font-bold` on the same label.
 *   4. The flex row uses `items-center` (not `items-end`) so the
 *      labels share a single vertical midline and every tab's
 *      baseline sits exactly where its neighbors' baselines sit.
 *
 * Auto-centering: when the active tab changes, we use the same
 * trick as `CategoryChips` — call `scrollIntoView({ behavior: 'auto' })`
 * to let the browser compute the correct target scrollLeft in an
 * RTL-aware way, restore the old scroll position on the same frame
 * (no visible flicker), then manually animate with a custom
 * ease-out quart curve over 600 ms. Web-only; native keeps the
 * static bar and relies on the user manually panning the row.
 *
 * A `Menu` hamburger icon sits at the inline-end of the bar. In the
 * reference design tapping it opens a bottom sheet with the full
 * section list; in this first pass the icon is a non-interactive
 * placeholder. Wire up the sheet in a follow-up.
 */
export function CategoryTabs({ sections, active, onSelect }: Props) {
  const tabRefs = useRef<Map<string, View | null>>(new Map());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = tabRefs.current.get(active);
    if (!node) return;

    const tabEl = node as unknown as HTMLElement | null;
    if (!tabEl || typeof tabEl.scrollIntoView !== 'function') return;

    const scrollEl = findScrollableX(tabEl);
    if (!scrollEl) return;

    // Capture current scroll position before asking the browser to
    // compute the centered target.
    const startScrollLeft = scrollEl.scrollLeft;

    // Let the browser compute the correct target synchronously, then
    // restore the original position on the same frame so the
    // intermediate state never paints.
    tabEl.scrollIntoView({ block: 'nearest', inline: 'center' });
    const targetScrollLeft = scrollEl.scrollLeft;
    scrollEl.scrollLeft = startScrollLeft;

    if (Math.abs(targetScrollLeft - startScrollLeft) < 1) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const container = scrollEl;
    const duration = 600;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      container.scrollLeft =
        startScrollLeft + (targetScrollLeft - startScrollLeft) * eased;
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active]);

  return (
    <View className="flex-row items-stretch border-b border-gray-100 bg-page">
      {/* Scrollable tabs on the inline-start edge. Because this is
          the first child of a flex-row, in RTL it starts at the
          right edge and scrolls toward the left; in LTR it starts
          at the left edge and scrolls toward the right. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-1"
      >
        <View className="flex-row items-center" style={{ gap: 20 }}>
          {sections.map((section) => {
            const isActive = section.id === active;
            return (
              <Pressable
                key={section.id}
                ref={(node) => {
                  if (node) {
                    tabRefs.current.set(section.id, node);
                  } else {
                    tabRefs.current.delete(section.id);
                  }
                }}
                onPress={() => onSelect(section.id)}
                // `relative` anchors the absolutely-positioned
                // underline below. Fixed py-3 keeps every tab at
                // the same height regardless of active state.
                className="relative py-3"
              >
                <Text
                  className={`text-sm ${isActive ? 'font-bold' : ''}`}
                  style={{
                    color: isActive
                      ? colors.ink.primary
                      : colors.ink.secondary,
                  }}
                >
                  {section.name}
                </Text>

                {/* Absolute-positioned underline — rendered OUT of
                    layout flow so toggling it on the active tab
                    does not push the label up. Sits pinned to the
                    bottom of the Pressable's padding box, full
                    width of the label. */}
                {isActive ? (
                  <View
                    className="absolute start-0 end-0 rounded-full"
                    style={{
                      bottom: 4,
                      height: 2,
                      backgroundColor: colors.ink.primary,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Hamburger menu icon pinned to the inline-end edge of the
          tab bar — left in RTL, right in LTR. Sits in a fixed-width
          cell with a leading border so the scrollable tabs don't
          slide underneath it when the user pans them. */}
      <View className="items-center justify-center border-s border-gray-100 px-3">
        <Menu color={colors.ink.primary} size={20} strokeWidth={2} />
      </View>
    </View>
  );
}
