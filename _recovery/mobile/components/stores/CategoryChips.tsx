import { useEffect, useRef } from 'react';
import { ScrollView, Pressable, Text, Platform, View } from 'react-native';

type Props = {
  /** Full list of category labels to render as pill chips. */
  categories: string[];
  /** The currently selected category label. */
  active: string;
  /** Fired when the user taps a chip. */
  onSelect: (category: string) => void;
};

// Ease-out quart — stronger deceleration than cubic: the scroll
// starts moving quickly and then glides to a very soft stop, which
// reads as "smooth" on a horizontal chip row much better than the
// browser's default curve. We use a custom RAF animation instead of
// CSS `scroll-behavior: smooth` so we can tune the duration and the
// curve independently of whatever timing the browser happens to use.
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// Walk up the DOM tree from a node until we find its nearest
// horizontally-scrollable ancestor. Used to locate the ScrollView's
// inner scroll div from inside a chip's ref.
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
 * Horizontal pill scroller of category filters. Controlled — the
 * parent decides which chip is active and what filtering happens.
 *
 * react-native-web inherits the document's `direction` for horizontal
 * ScrollView and flex-row, so the chips automatically flip with the
 * locale: the first chip in the array sits at the inline-start edge
 * (right in RTL, left in LTR) and the rest extend toward inline-end.
 *
 * On active change the tapped chip auto-scrolls to the horizontal
 * center of the viewport so the currently-selected filter never ends
 * up clipped at an edge — matches the behavior of iOS chip rows in
 * App Store and Apple Music.
 *
 * ## Smooth scroll implementation
 *
 * The naive approach — `ScrollView.scrollTo({ x })` — fails in RTL on
 * react-native-web because `scrollLeft` has inconsistent semantics
 * across browser engines in right-to-left documents. `scrollIntoView
 * ({ inline: 'center' })` handles RTL correctly but runs on the
 * browser's default smooth-scroll curve which feels abrupt.
 *
 * Workaround: we leverage the browser's RTL-aware
 * `scrollIntoView({ behavior: 'auto' })` to compute the correct
 * target `scrollLeft` synchronously, restore the original scroll
 * position on the same frame (no visible flicker), then animate from
 * old → new with a custom ease-out cubic over 450ms. Result: same
 * correct centering in both LTR and RTL, but with the exact easing
 * curve we want.
 */
export function CategoryChips({ categories, active, onSelect }: Props) {
  const chipRefs = useRef<Map<string, View | null>>(new Map());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = chipRefs.current.get(active);
    if (!node) return;

    const chipEl = node as unknown as HTMLElement | null;
    if (!chipEl || typeof chipEl.scrollIntoView !== 'function') return;

    const scrollEl = findScrollableX(chipEl);
    if (!scrollEl) return;

    // Capture the current scroll position BEFORE asking the browser
    // to compute the centered target.
    const startScrollLeft = scrollEl.scrollLeft;

    // Trick: call scrollIntoView with `behavior: 'auto'` (instant) so
    // the browser does its RTL-aware target calculation for us. The
    // read/restore happens synchronously within the same frame, so
    // the browser never paints the intermediate state and no flicker
    // is visible on screen.
    chipEl.scrollIntoView({ block: 'nearest', inline: 'center' });
    const targetScrollLeft = scrollEl.scrollLeft;
    scrollEl.scrollLeft = startScrollLeft;

    // Nothing to animate if we're already centered (or within a
    // subpixel of it — scrollIntoView can produce float positions).
    if (Math.abs(targetScrollLeft - startScrollLeft) < 1) return;

    // Cancel any in-flight animation so a rapid tap interrupts the
    // previous scroll cleanly instead of stuttering on top of it.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const container = scrollEl;
    // 600ms + quart easing feels "soft" on both iPhone Safari and
    // desktop Chrome. Shorter (< 450ms) reads as abrupt; longer
    // (> 750ms) starts to feel laggy on a filter chip interaction.
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className="mb-5"
    >
      {categories.map((cat) => {
        const isActive = cat === active;
        return (
          <Pressable
            key={cat}
            ref={(node) => {
              if (node) {
                chipRefs.current.set(cat, node);
              } else {
                chipRefs.current.delete(cat);
              }
            }}
            onPress={() => onSelect(cat)}
            className={
              isActive
                ? 'rounded-full border border-brand-100 bg-brand-50 px-5 py-2'
                : 'rounded-full border border-gray-200 bg-white px-5 py-2'
            }
          >
            <Text
              className={
                isActive ? 'text-xs text-brand' : 'text-xs text-gray-700'
              }
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
