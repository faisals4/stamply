import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform, View, Text, Image, Pressable, Animated } from 'react-native';
import { Crosshair, Plus, Minus } from 'lucide-react-native';
import { colors } from '../../lib/colors';

// Lazy import for native only — avoids bundling on web
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

type MarkerData = {
  id: string | number;
  lat: number;
  lng: number;
  title?: string;
  logo?: string | null;
};

type Props = {
  userLoc?: { lat: number; lng: number } | null;
  markers: MarkerData[];
  height?: number;
  interactive?: boolean;
  onMarkerPress?: (id: string | number) => void;
  /** When set, the map animates to this coordinate. */
  centerOn?: { lat: number; lng: number } | null;
};

/**
 * Cross-platform map component:
 * - iOS/Android: Apple Maps / Google Maps via react-native-maps
 * - Web: returns null (caller should use Leaflet iframe)
 *
 * Full-screen mode (height=undefined): shows zoom +/- and "my location"
 * buttons in top-right corner — matches the Leaflet web UI.
 */
export function NativeMapView({ userLoc, markers, height, interactive = true, onMarkerPress, centerOn }: Props) {
  if (Platform.OS === 'web' || !MapView) return null;

  const mapRef = useRef<any>(null);
  const isFullScreen = height == null;
  const centerLat = userLoc?.lat ?? (markers.length > 0 ? markers.reduce((s, m) => s + m.lat, 0) / markers.length : 24.7);
  const centerLng = userLoc?.lng ?? (markers.length > 0 ? markers.reduce((s, m) => s + m.lng, 0) / markers.length : 46.7);
  const [region, setRegion] = useState({
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Only render markers that are inside (or near) the visible region.
  // Adds a 50% padding so markers at the edge don't pop in abruptly.
  const visibleMarkers = isFullScreen
    ? markers.filter((m) => {
        const padLat = region.latitudeDelta * 0.5;
        const padLng = region.longitudeDelta * 0.5;
        return (
          m.lat >= region.latitude - region.latitudeDelta / 2 - padLat &&
          m.lat <= region.latitude + region.latitudeDelta / 2 + padLat &&
          m.lng >= region.longitude - region.longitudeDelta / 2 - padLng &&
          m.lng <= region.longitude + region.longitudeDelta / 2 + padLng
        );
      })
    : markers; // Small maps (mini, branch) show all markers

  // Animate to centerOn when it changes (e.g. branch selected)
  useEffect(() => {
    if (!centerOn) return;
    const next = { latitude: centerOn.lat, longitude: centerOn.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 400);
  }, [centerOn?.lat, centerOn?.lng]);

  const zoomIn = () => {
    const next = {
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 300);
  };

  const zoomOut = () => {
    const next = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 60),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 60),
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 300);
  };

  const goToMyLocation = () => {
    if (!userLoc) return;
    const next = { ...region, latitude: userLoc.lat, longitude: userLoc.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 400);
  };

  return (
    <View style={{ flex: isFullScreen ? 1 : undefined, height: isFullScreen ? undefined : (height ?? 200), borderRadius: isFullScreen ? 0 : 16, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={(r: any) => setRegion(r)}
        showsUserLocation={!!userLoc}
        showsMyLocationButton={false}
        showsCompass={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {visibleMarkers.map((m) => (
          <MapMarker
            key={m.id}
            marker={m}
            Marker={Marker}
            onPress={() => onMarkerPress?.(m.id)}
          />
        ))}
      </MapView>

      {/* Map controls — top-right, matches Leaflet web layout */}
      {interactive && isFullScreen && (
        <View style={{ position: 'absolute', top: 12, right: 12, gap: 8 }}>
          {/* My location button */}
          {userLoc && (
            <Pressable
              onPress={goToMyLocation}
              style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Crosshair color="#666" size={20} strokeWidth={2} />
            </Pressable>
          )}

          {/* Zoom controls */}
          <View style={{
            borderRadius: 10, overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 4,
            elevation: 4,
          }}>
            <Pressable
              onPress={zoomIn}
              style={{
                width: 40, height: 40,
                backgroundColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
                borderBottomWidth: 1, borderBottomColor: '#e5e5e5',
              }}
            >
              <Plus color="#666" size={18} strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={zoomOut}
              style={{
                width: 40, height: 40,
                backgroundColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Minus color="#666" size={18} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Individual map marker with logo support.
 * Uses `tracksViewChanges` to re-render the marker bitmap after
 * the logo image finishes loading — without this, react-native-maps
 * takes a snapshot before the Image resolves and shows the fallback letter.
 * Once loaded, `tracksViewChanges` is set to false for performance.
 */
function MapMarker({ marker: m, Marker: MarkerComponent, onPress }: {
  marker: MarkerData;
  Marker: any;
  onPress: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const hasLogo = !!m.logo && !imageError;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Pop-in animation when marker appears
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <MarkerComponent
      coordinate={{ latitude: m.lat, longitude: m.lng }}
      onPress={onPress}
      tracksViewChanges={hasLogo && !imageLoaded}
    >
      <Animated.View style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: hasLogo ? '#fff' : '#E5E7EB',
        borderWidth: 2.5, borderColor: colors.brand.DEFAULT,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        transform: [{ scale: scaleAnim }],
      }}>
        {hasLogo ? (
          <Image
            source={{ uri: m.logo! }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '700' }}>
            {(m.title ?? '?').charAt(0)}
          </Text>
        )}
      </Animated.View>
    </MarkerComponent>
  );
}
