import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { MapPin, Navigation } from 'lucide-react-native';
import { NativeMapView } from './NativeMapView';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import type { TenantLocation } from '../../lib/api';

/** Haversine distance in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Props = {
  locations: TenantLocation[];
  userLoc?: { lat: number; lng: number } | null;
  selectedId?: number | null;
  onSelect?: (loc: TenantLocation) => void;
  /** Store logo URL — shown on all branch markers. */
  logoUrl?: string | null;
};

/**
 * Interactive map showing branch markers.
 * Auto-selects the nearest branch to the user and centers the map on it.
 *
 * Web: Leaflet iframe with custom markers.
 * Native: Apple Maps via NativeMapView with user location dot.
 */
export function BranchMapBlock({ locations, userLoc, selectedId, onSelect, logoUrl }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Filter locations that have coordinates
  const mappable = locations.filter((l) => l.lat && l.lng);

  // Resolve selected from external ID
  const selected = selectedId != null ? mappable.find((l) => l.id === selectedId) ?? null : null;
  const handleSelect = (loc: TenantLocation) => { if (onSelect) onSelect(loc); };

  // Listen for marker clicks from the iframe (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'branch-select') {
        const loc = mappable.find((l) => l.id === e.data.id);
        if (loc) handleSelect(loc);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [mappable]);

  if (mappable.length === 0) return null;

  // Center on selected branch, or center of all branches
  const centerLat = selected?.lat ?? mappable.reduce((s, l) => s + l.lat!, 0) / mappable.length;
  const centerLng = selected?.lng ?? mappable.reduce((s, l) => s + l.lng!, 0) / mappable.length;

  // Build Leaflet HTML for the iframe (web)
  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .branch-icon {
      background: white;
      border: 2px solid ${colors.brand.DEFAULT};
      border-radius: 50%;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      cursor: pointer;
    }
    .branch-icon.active {
      background: ${colors.brand.DEFAULT};
      border-color: ${colors.brand.DEFAULT};
    }
    .branch-icon svg { pointer-events: none; }
    .my-loc{position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center}
    .my-dot{width:12px;height:12px;background:#4285F4;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3);z-index:2;position:relative}
    .my-pulse{position:absolute;top:50%;left:50%;width:34px;height:34px;margin-left:-17px;margin-top:-17px;background:rgba(66,133,244,.3);border-radius:50%;z-index:1;animation:p 2s cubic-bezier(0,0,.2,1) infinite}
    @keyframes p{0%{transform:scale(0.3);opacity:.8}50%{opacity:.4}100%{transform:scale(1.2);opacity:0}}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    ${userLoc ? `L.marker([${userLoc.lat},${userLoc.lng}],{icon:L.divIcon({html:'<div class="my-loc"><div class="my-pulse"></div><div class="my-dot"></div></div>',className:'',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);` : ''}

    var markers = [];
    var branches = ${JSON.stringify(mappable.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, name: l.name })))};
    var nearestId = ${selectedId ?? 'null'};

    branches.forEach(function(b) {
      var isNearest = b.id === nearestId;
      var icon = L.divIcon({
        html: '<div class="branch-icon' + (isNearest ? ' active' : '') + '" id="icon-' + b.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + (isNearest ? 'white' : '${colors.brand.DEFAULT}') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      var m = L.marker([b.lat, b.lng], { icon: icon }).addTo(map);
      m.on('click', function() {
        document.querySelectorAll('.branch-icon').forEach(function(el) {
          el.classList.remove('active');
          el.querySelector('svg').setAttribute('stroke', '${colors.brand.DEFAULT}');
        });
        var el = document.getElementById('icon-' + b.id);
        if (el) {
          el.classList.add('active');
          el.querySelector('svg').setAttribute('stroke', 'white');
        }
        window.parent.postMessage({ type: 'branch-select', id: b.id }, '*');
      });
      markers.push(m);
    });

    // Auto-select nearest
    if (nearestId) {
      window.parent.postMessage({ type: 'branch-select', id: nearestId }, '*');
    }

    if (markers.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  <\/script>
</body>
</html>`;

  const openDirections = () => {
    if (!selected) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={{ gap: 12 }} className="mb-4">
      {/* Map */}
      {Platform.OS === 'web' ? (
        <View className="overflow-hidden rounded-2xl" style={{ height: 200 }}>
          <iframe
            ref={iframeRef as any}
            srcDoc={leafletHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </View>
      ) : (
        <NativeMapView
          userLoc={userLoc}
          markers={mappable.map((l) => ({ id: l.id, lat: l.lat!, lng: l.lng!, title: l.name, logo: logoUrl ?? null }))}
          height={200}
          centerOn={selected ? { lat: selected.lat!, lng: selected.lng! } : null}
          onMarkerPress={(id) => {
            const loc = mappable.find((l) => l.id === id);
            if (loc) handleSelect(loc);
          }}
        />
      )}

      {/* Selected branch info */}
      {selected && (
        <View className={`${surfaces.card} p-4`} style={{ gap: 12 }}>
          <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
            <View className="flex-1 flex-row items-start" style={{ gap: 8 }}>
              <MapPin color={colors.brand.DEFAULT} size={18} strokeWidth={2} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
                  {selected.name}
                </Text>
                {selected.address ? (
                  <Text style={localeDirStyle} className="mt-0.5 text-start text-xs text-gray-500">
                    {selected.address}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={openDirections}
              className="flex-row items-center rounded-xl border border-gray-200 px-3 py-1.5"
              style={{ gap: 6 }}
            >
              <Navigation color={colors.ink.primary} size={14} strokeWidth={2} />
              <Text className="text-xs text-gray-700">
                {t('checkout.block_branch_directions')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
