import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { API_URL } from '../../lib/api';

/* ── Types ───────────────────────────────────────────────────────── */

type BannerItem = {
  id: number;
  title: string;
  image_url: string;
};

/* ── Constants ───────────────────────────────────────────────────── */

const BANNER_HEIGHT = 160;
const AUTO_SCROLL_INTERVAL = 4000;

/* ── Component ───────────────────────────────────────────────────── */

export function HeroBannerSlider() {
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const containerWidth = measuredWidth > 0 ? measuredWidth : screenWidth - 32;

  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannersRef = useRef(banners);
  bannersRef.current = banners;

  /* — Fetch banners ──────────────────────────────────────────── */

  useEffect(() => {
    fetch(`${API_URL}/public/banners`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.length) setBanners(json.data);
      })
      .catch(() => {});
  }, []);

  /* — Auto scroll ────────────────────────────────────────────── */

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    if (bannersRef.current.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const len = bannersRef.current.length;
        return len <= 1 ? prev : (prev + 1) % len;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [stopAutoScroll]);

  useEffect(() => {
    if (banners.length > 1) startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll, banners.length]);

  /* — Render ─────────────────────────────────────────────────── */

  if (banners.length === 0) return null;

  const currentBanner = banners[activeIndex];

  return (
    <View
      style={{ marginBottom: 12 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== measuredWidth) setMeasuredWidth(w);
      }}
    >
      {containerWidth > 0 && (
        <Pressable
          onPressIn={stopAutoScroll}
          onPressOut={() => startAutoScroll()}
        >
          <View
            style={{
              width: containerWidth,
              height: BANNER_HEIGHT,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: '#f1f5f9',
            }}
          >
            <Image
              source={{ uri: currentBanner.image_url }}
              style={{ width: containerWidth, height: BANNER_HEIGHT }}
              resizeMode="cover"
            />
          </View>
        </Pressable>
      )}

      {/* Dots */}
      {banners.length > 1 && (
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
            <Pressable
              key={index}
              onPress={() => {
                setActiveIndex(index);
                stopAutoScroll();
                startAutoScroll();
              }}
            >
              <View
                style={{
                  width: activeIndex === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: activeIndex === index ? '#eb592e' : '#D1D5DB',
                }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
