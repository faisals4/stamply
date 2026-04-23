import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Image,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { API_URL } from '../../lib/api';

/**
 * Compact auto-scrolling banner for the Loyalty Stores screen.
 *
 * Uses the same `/api/public/banners` endpoint as the home-screen
 * `HeroBannerSlider`, but with a different UX:
 *
 *   - NO dots indicator — cleaner for an inner-page position
 *   - Auto-slides every 4 s (loops back to first)
 *   - Supports finger swipe via horizontal FlatList (pagingEnabled)
 *   - Pauses auto-scroll while the user is touching / swiping
 *   - Smaller height (120 vs 160) to leave more room for the store list
 *
 * Why a separate component instead of reusing HeroBannerSlider?
 * The home slider uses index-based cross-fade (single Image swapped
 * by state). This one uses a real FlatList scroller so the swipe
 * gesture is natively handled by the scrollview — smoother on low-end
 * Android, and the auto-scroll can call scrollToOffset which animates
 * the transition instead of a hard image swap.
 */

type BannerItem = {
  id: number;
  title: string;
  image_url: string;
};

const BANNER_HEIGHT = 160;
const AUTO_SCROLL_MS = 4000;

export function StoreBannerStrip({
  showDots = false,
  /** Set to 0 when the parent already provides horizontal padding
   *  (e.g. ScrollView contentContainerStyle). Default 16. */
  horizontalPadding = 16,
}: {
  showDots?: boolean;
  horizontalPadding?: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const bannerWidth = containerWidth > 0 ? containerWidth : screenWidth - horizontalPadding * 2;

  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0); // state for dots re-render
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTouching = useRef(false);
  const bannersRef = useRef(banners);
  bannersRef.current = banners;

  /* ── Fetch banners ──────────────────────────────────────────── */

  useEffect(() => {
    fetch(`${API_URL}/public/banners`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.length) setBanners(json.data);
      })
      .catch(() => {});
  }, []);

  /* ── Auto-scroll timer ──────────────────────────────────────── */

  const stopAuto = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    if (bannersRef.current.length <= 1) return;
    autoTimer.current = setInterval(() => {
      if (isTouching.current) return;
      const len = bannersRef.current.length;
      if (len <= 1) return;
      const next = (currentIndex.current + 1) % len;
      currentIndex.current = next;
      setActiveIdx(next);
      flatListRef.current?.scrollToOffset({
        offset: next * bannerWidth,
        animated: true,
      });
    }, AUTO_SCROLL_MS);
  }, [stopAuto, bannerWidth]);

  useEffect(() => {
    if (banners.length > 1) startAuto();
    return stopAuto;
  }, [startAuto, stopAuto, banners.length]);

  /* ── Track which page the user swiped to ────────────────────── */

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        currentIndex.current = viewableItems[0].index;
        setActiveIdx(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  /* ── Touch handlers ─────────────────────────────────────────── */

  const onScrollBeginDrag = () => {
    isTouching.current = true;
    stopAuto();
  };

  const onScrollEndDrag = () => {
    isTouching.current = false;
    startAuto();
  };

  /* ── Render ─────────────────────────────────────────────────── */

  if (banners.length === 0) return null;

  return (
    <View
      style={{ paddingHorizontal: horizontalPadding, marginBottom: 8 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width - horizontalPadding * 2;
        if (w > 0 && w !== containerWidth) setContainerWidth(w);
      }}
    >
      {bannerWidth > 0 && (
        <FlatList
          ref={flatListRef}
          data={banners}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          snapToInterval={bannerWidth}
          snapToAlignment="start"
          renderItem={({ item }) => (
            <View
              style={{
                width: bannerWidth,
                height: BANNER_HEIGHT,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
              }}
            >
              <Image
                source={{ uri: item.image_url }}
                style={{ width: bannerWidth, height: BANNER_HEIGHT }}
                resizeMode="cover"
              />
            </View>
          )}
        />
      )}

      {/* Optional dots — shown on the home screen, hidden on loyalty stores */}
      {showDots && banners.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
            gap: 6,
          }}
        >
          {banners.map((_, index) => (
            <View
              key={index}
              style={{
                width: activeIdx === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  activeIdx === index ? '#eb592e' : '#D1D5DB',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
