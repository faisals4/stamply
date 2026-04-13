import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import type { TenantLocation } from '../../lib/api';

/**
 * Interactive OpenStreetMap (Leaflet) showing branch markers.
 * Tapping a marker selects the branch and shows an info block
 * below with name, address, and a "Directions" button.
 *
 * Web: renders an iframe with Leaflet CDN + markers.
 * Native: falls back to a static list (same as BranchesSection).
 */
export function BranchMapBlock({ locations }: { locations: TenantLocation[] }) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [selected, setSelected] = useState<TenantLocation | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Filter locations that have coordinates
  const mappable = locations.filter((l) => l.lat && l.lng);

  // Listen for marker clicks from the iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'branch-select') {
        const loc = mappable.find((l) => l.id === e.data.id);
        if (loc) setSelected(loc);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [mappable]);

  if (mappable.length === 0) return null;

  // Memoize center + Leaflet HTML to avoid rebuilding on every render
  const { centerLat, centerLng, leafletHtml } = useMemo(() => {
    const cLat = mappable.reduce((s, l) => s + l.lat!, 0) / mappable.length;
    const cLng = mappable.reduce((s, l) => s + l.lng!, 0) / mappable.length;
    const html = `
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], ${mappable.length === 1 ? 15 : 12});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    var markers = [];
    var branches = ${JSON.stringify(mappable.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, name: l.name })))};

    branches.forEach(function(b) {
      var icon = L.divIcon({
        html: '<div class="branch-icon" id="icon-' + b.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colors.brand.DEFAULT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      var m = L.marker([b.lat, b.lng], { icon: icon }).addTo(map);
      m.on('click', function() {
        // Reset all icons
        document.querySelectorAll('.branch-icon').forEach(function(el) {
          el.classList.remove('active');
          el.querySelector('svg').setAttribute('stroke', '${colors.brand.DEFAULT}');
        });
        // Highlight selected
        var el = document.getElementById('icon-' + b.id);
        if (el) {
          el.classList.add('active');
          el.querySelector('svg').setAttribute('stroke', 'white');
        }
        window.parent.postMessage({ type: 'branch-select', id: b.id }, '*');
      });
      markers.push(m);
    });

    if (markers.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  <\/script>
</body>
</html>`;
    return { centerLat: cLat, centerLng: cLng, leafletHtml: html };
  }, [mappable.length]);

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
      ) : null}

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
