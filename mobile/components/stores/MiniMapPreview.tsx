import { Platform } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { NativeMapView } from './NativeMapView';
import { useUserLocation } from '../../lib/useUserLocation';

/**
 * Self-contained mini map that loads its own data.
 * Shows user location + nearby store markers.
 * Works on both web (Leaflet iframe) and native (Apple Maps).
 */
export function MiniMapPreview({ height = 150 }: { height?: number }) {
  const { loc: userLoc } = useUserLocation();

  // Fetch first page of tenants for markers
  const { data } = useInfiniteQuery({
    queryKey: ['discover-tenants', userLoc?.lat, userLoc?.lng],
    queryFn: async ({ pageParam = 1 }) => api.discoverTenants(pageParam, userLoc),
    getNextPageParam: () => undefined, // only first page
    initialPageParam: 1,
    enabled: !!userLoc,
  });

  if (!userLoc) return null;

  const tenants = data?.pages?.[0]?.data ?? [];
  const nearby = tenants
    .flatMap((t: any) => (t.locations ?? []).filter((l: any) => l.lat && l.lng).map((l: any) => ({
      lat: l.lat, lng: l.lng, initial: (t.name ?? '?').charAt(0), logo: t.logo_url ?? null,
    })))
    .filter((m: any) => Math.abs(m.lat - userLoc.lat) < 0.05 && Math.abs(m.lng - userLoc.lng) < 0.05)
    .slice(0, 30);

  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>*{margin:0;padding:0}#map{width:100%;height:100vh}
.mi{background:#fff;border:2px solid #eb592e;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.2);color:#eb592e;font-size:10px;font-weight:700;overflow:hidden}
.mi img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.ml{position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center}
.md{width:12px;height:12px;background:#4285F4;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3);z-index:2;position:relative}
.mp{position:absolute;top:50%;left:50%;width:34px;height:34px;margin-left:-17px;margin-top:-17px;background:rgba(66,133,244,.3);border-radius:50%;z-index:1;animation:p 2s cubic-bezier(0,0,.2,1) infinite}
@keyframes p{0%{transform:scale(0.3);opacity:.8}50%{opacity:.4}100%{transform:scale(1.2);opacity:0}}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false}).setView([${userLoc.lat},${userLoc.lng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.marker([${userLoc.lat},${userLoc.lng}],{icon:L.divIcon({html:'<div class="ml"><div class="mp"></div><div class="md"></div></div>',className:'',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
var ms=${JSON.stringify(nearby)};
ms.forEach(function(m){
  var c=m.logo?'<img src="'+m.logo+'">':m.initial;
  L.marker([m.lat,m.lng],{icon:L.divIcon({html:'<div class="mi">'+c+'</div>',className:'',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map);
});
<\/script></body></html>`;

  // Native: use Apple Maps / Google Maps
  if (Platform.OS !== 'web') {
    const nativeMarkers = nearby.map((m: any, i: number) => ({
      id: `mini-${i}`,
      lat: m.lat,
      lng: m.lng,
      title: m.initial,
      logo: m.logo ?? null,
    }));
    return (
      <NativeMapView
        userLoc={userLoc}
        markers={nativeMarkers}
        height={height}
        interactive={false}
      />
    );
  }

  // Web: use Leaflet iframe
  return (
    <iframe
      srcDoc={html}
      style={{ width: '100%', height, border: 'none', borderRadius: 14, pointerEvents: 'none' }}
    />
  );
}
