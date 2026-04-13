import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Menu as MenuIcon } from 'lucide-react-native';
import { api, TenantLocation } from '../../lib/api';
import { colors } from '../../lib/colors';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { SegmentedToggle } from '../../components/ui/SegmentedToggle';

export default function LoyaltyStoresScreen() {
  const { t } = useTranslation();

  // User location
  const LOC_KEY = 'stamply.user.location';
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOC_KEY);
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          localStorage.setItem(LOC_KEY, JSON.stringify(loc));
        },
        () => {},
        { timeout: 5000 },
      );
    }
  }, []);

  // Paginated tenants sorted by nearest
  const {
    data: infiniteData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['discover-tenants', userLoc?.lat, userLoc?.lng],
    queryFn: async ({ pageParam = 1 }) => api.discoverTenants(pageParam, userLoc),
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
    initialPageParam: 1,
  });

  const allTenants = infiniteData?.pages.flatMap((p) => p.data) ?? [];

  // View toggle (list / map)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Scroll position restore
  const scrollRef = useRef<ScrollView>(null);
  const savedScrollY = useRef(0);

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <ScreenContainer>
        <HeaderBar
          title={t('cards.loyalty_stores_title')}
          subtitle={t('cards.loyalty_stores_subtitle')}
          onBack={() => router.back()}
          endAction={
            <SegmentedToggle
              segments={[
                { key: 'list' as const, icon: MenuIcon },
                { key: 'map' as const, icon: MapIcon },
              ]}
              active={viewMode}
              onChange={setViewMode}
            />
          }
        />

        {isLoading ? (
          <LoadingState />
        ) : allTenants.length === 0 ? (
          <EmptyState title={t('cards.empty_title')} subtitle={t('cards.empty_subtitle')} />
        ) : viewMode === 'map' ? (
          <StoresMapView
            tenants={allTenants}
            userLoc={userLoc}
            onSelect={(t_item) => router.push(`/store-detail/${t_item.id}` as any)}
          />
        ) : (
          <ScrollView
            className="flex-1"
            ref={scrollRef}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 10 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              savedScrollY.current = contentOffset.y;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            scrollEventThrottle={100}
          >
            {/* Mini map preview */}
            {Platform.OS === 'web' && userLoc && (
              <Pressable onPress={() => setViewMode('map')} className="mb-3 overflow-hidden rounded-2xl" style={{ height: 150 }}>
                <MiniMapPreview userLoc={userLoc} tenants={allTenants} />
              </Pressable>
            )}

            {allTenants.map((t_item) => (
              <Pressable
                key={t_item.id}
                onPress={() => router.push(`/store-detail/${t_item.id}` as any)}
                className={`flex-row items-center ${surfaces.card} p-3`}
                style={[shadows.card, { gap: 12 }]}
              >
                {t_item.logo_url ? (
                  <Image source={{ uri: t_item.logo_url }} style={{ width: 70, height: 70, borderRadius: 16 }} resizeMode="cover" />
                ) : (
                  <View className="items-center justify-center rounded-xl" style={{ width: 70, height: 70, backgroundColor: colors.ink.secondary }}>
                    <Text className="font-bold text-white" style={{ fontSize: 12 }} numberOfLines={1}>{t_item.name.charAt(0)}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{t_item.name}</Text>
                  {(t_item as any).description ? (
                    <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>{(t_item as any).description}</Text>
                  ) : null}
                  <View className="mt-0.5 flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-3xs text-gray-400">
                      {t('cards.loyalty_stores_count', { count: t_item.active_cards_count })}
                    </Text>
                    {(t_item as any).nearest_km != null && (t_item as any).nearest_km < 999999 ? (
                      <>
                        <Text className="text-3xs text-gray-300">•</Text>
                        <Text className="text-3xs text-gray-400">{`${(t_item as any).nearest_km} ${t('cards.km')}`}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
            {isFetchingNextPage && (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.brand.DEFAULT} size="small" />
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}

/* ─── Stores Map View ─── */

function StoresMapView({
  tenants, userLoc, onSelect,
}: {
  tenants: any[];
  userLoc: { lat: number; lng: number } | null;
  onSelect: (t: any) => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedTenant = tenants.find((x) => x.id === selectedId);

  const markers = tenants.flatMap((tenant) =>
    (tenant.locations ?? [])
      .filter((l: any) => l.lat && l.lng)
      .map((l: any) => ({ lat: l.lat, lng: l.lng, tid: tenant.id, initial: (tenant.name ?? '?').charAt(0), logo: tenant.logo_url ?? null }))
  );

  const centerLat = userLoc?.lat ?? (markers.length > 0 ? markers.reduce((s, m) => s + m.lat, 0) / markers.length : 24.7);
  const centerLng = userLoc?.lng ?? (markers.length > 0 ? markers.reduce((s, m) => s + m.lng, 0) / markers.length : 46.7);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'store-select') setSelectedId(e.data.tenantId);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const leafletHtml = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>*{margin:0;padding:0}#map{width:100%;height:100vh}
.si{background:#fff;border:2px solid #eb592e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2);cursor:pointer;color:#eb592e;font-size:12px;font-weight:700;overflow:hidden}
.si img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.si.active{border-color:#111827;box-shadow:0 3px 10px rgba(0,0,0,.3)}
.my-loc{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center}
.my-dot{width:14px;height:14px;background:#4285F4;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);z-index:2;position:relative}
.my-pulse{position:absolute;top:50%;left:50%;width:44px;height:44px;margin-left:-22px;margin-top:-22px;background:rgba(66,133,244,.3);border-radius:50%;z-index:1;animation:pulse 2s cubic-bezier(0,0,.2,1) infinite}
@keyframes pulse{0%{transform:scale(0.3);opacity:.8}50%{opacity:.4}100%{transform:scale(1.2);opacity:0}}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLng}],${userLoc ? 16 : 12});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
${userLoc ? `L.marker([${userLoc.lat},${userLoc.lng}],{icon:L.divIcon({html:'<div class="my-loc"><div class="my-pulse"></div><div class="my-dot"></div></div>',className:'',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(map);` : ''}
var ms=${JSON.stringify(markers)};
ms.forEach(function(m){
  var content=m.logo?'<img src="'+m.logo+'" alt="">':m.initial;
  var ic=L.divIcon({html:'<div class="si" data-tid="'+m.tid+'">'+content+'</div>',className:'',iconSize:[40,40],iconAnchor:[20,20]});
  L.marker([m.lat,m.lng],{icon:ic}).addTo(map).on('click',function(){
    document.querySelectorAll('.si').forEach(function(el){el.classList.remove('active')});
    document.querySelectorAll('.si[data-tid="'+m.tid+'"]').forEach(function(el){el.classList.add('active')});
    window.parent.postMessage({type:'store-select',tenantId:m.tid},'*');
  });
});
${userLoc ? '' : `if(ms.length>1){var g=L.featureGroup(ms.map(function(m){return L.marker([m.lat,m.lng])}));map.fitBounds(g.getBounds(),{padding:[40,40]})}`}
${userLoc ? `
var myLocBtn=L.control({position:'topright'});
myLocBtn.onAdd=function(){
  var div=document.createElement('div');
  div.innerHTML='<button style="width:40px;height:40px;background:#fff;border:none;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;margin:10px" title="موقعي"><svg width="20" height="20" viewBox="0 0 24 24" fill="#666"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg></button>';
  div.querySelector('button').onclick=function(){map.setView([${userLoc.lat},${userLoc.lng}],16)};
  return div;
};
myLocBtn.addTo(map);
` : ''}
var zoomCtrl=L.control({position:'topright'});
zoomCtrl.onAdd=function(){
  var div=document.createElement('div');
  div.style.cssText='display:flex;flex-direction:column;margin:0 10px;box-shadow:0 1px 4px rgba(0,0,0,.3);border-radius:8px;overflow:hidden';
  var btnStyle='width:40px;height:40px;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#666';
  div.innerHTML='<button style="'+btnStyle+';border-bottom:1px solid #e5e5e5">+</button><button style="'+btnStyle+'">−</button>';
  var btns=div.querySelectorAll('button');
  btns[0].onclick=function(){map.zoomIn()};
  btns[1].onclick=function(){map.zoomOut()};
  return div;
};
zoomCtrl.addTo(map);
<\/script></body></html>`;

  return (
    <View className="flex-1">
      {Platform.OS === 'web' && (
        <View className="flex-1">
          <iframe srcDoc={leafletHtml} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
        </View>
      )}
      {selectedTenant && (
        <Pressable
          onPress={() => onSelect(selectedTenant)}
          className={`absolute bottom-4 start-4 end-4 flex-row items-center ${surfaces.card} p-3`}
          style={[shadows.card, { gap: 12 }]}
        >
          {selectedTenant.logo_url ? (
            <Image source={{ uri: selectedTenant.logo_url }} style={{ width: 50, height: 50, borderRadius: 12 }} resizeMode="cover" />
          ) : (
            <View className="items-center justify-center rounded-xl" style={{ width: 50, height: 50, backgroundColor: colors.ink.secondary }}>
              <Text className="font-bold text-white" style={{ fontSize: 12 }}>{selectedTenant.name?.charAt(0)}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{selectedTenant.name}</Text>
            {selectedTenant.description ? <Text className="text-xs text-gray-500" numberOfLines={1}>{selectedTenant.description}</Text> : null}
            <Text className="text-3xs text-gray-400">
              {t('cards.loyalty_stores_count', { count: selectedTenant.active_cards_count })}
              {selectedTenant.nearest_km != null && selectedTenant.nearest_km < 999999 ? ` • ${selectedTenant.nearest_km} ${t('cards.km')}` : ''}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* ─── Mini Map Preview ─── */

function MiniMapPreview({ userLoc, tenants }: { userLoc: { lat: number; lng: number }; tenants: any[] }) {
  const nearby = tenants
    .flatMap((t) => (t.locations ?? []).filter((l: any) => l.lat && l.lng).map((l: any) => ({
      lat: l.lat, lng: l.lng, initial: (t.name ?? '?').charAt(0), logo: t.logo_url ?? null,
    })))
    .filter((m) => Math.abs(m.lat - userLoc.lat) < 0.05 && Math.abs(m.lng - userLoc.lng) < 0.05)
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

  return <iframe srcDoc={html} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16, pointerEvents: 'none' }} />;
}
