import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Plus, MapPin } from 'lucide-react-native';
import { api, Tenant, CardFull, TenantCardTemplate, TenantLocation } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { colors } from '../../lib/colors';
import { shadows } from '../../lib/shadows';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { CardVisual } from '../../components/cards/CardVisual';
import { CardDetailsSheet } from '../../components/cards/CardDetailsSheet';
import { BranchMapBlock } from '../../components/stores/BranchMapBlock';
import { FavoriteButton } from '../../components/ui/FavoriteButton';

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

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = Number(id);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // User location
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('stamply.user.location');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  // Customer profile for subscribe
  const { data: profile } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => (await api.me()).data,
  });

  // Tenant cards + locations
  const { data: tenantData, isLoading, error } = useQuery({
    queryKey: queryKeys.tenantCards(tenantId),
    queryFn: async () => (await api.tenantCards(tenantId)).data,
    enabled: tenantId > 0,
    retry: false,
  });

  // Customer's own cards — for card detail sheet
  const { data: cardsData } = useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => (await api.cards()).data,
  });
  const groups = cardsData ?? [];

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    // Check if this tenant is in favorites from discover query cache
    const cached = queryClient.getQueryData<any>(['discover-tenants']);
    if (cached?.pages?.[0]?.favorite_ids) {
      setIsFavorite(cached.pages[0].favorite_ids.includes(tenantId));
    }
  }, [tenantId]);

  const toggleFavorite = async () => {
    const wasFav = isFavorite;
    setIsFavorite(!wasFav);
    try {
      wasFav ? await api.removeFavorite(tenantId) : await api.addFavorite(tenantId);
      queryClient.invalidateQueries({ queryKey: ['discover-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch {
      setIsFavorite(wasFav);
    }
  };

  // Subscribe to card
  const handleSubscribe = async (templateId: number) => {
    if (!profile?.phone) {
      Alert.alert(t('errors.unknown'), 'Phone not available');
      return;
    }
    try {
      await api.subscribeToCard(templateId, {
        phone: profile.phone,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        birthdate: profile.birthdate,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantCards(tenantId) });
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message ?? '');
    }
  };

  // Card detail sheet
  const [sheetCard, setSheetCard] = useState<{ card: CardFull; tenant: Tenant | null } | null>(null);

  const tenantName = tenantData?.tenant?.name ?? '';

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar
          title={tenantName}
          onBack={() => router.back()}
          endAction={
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={toggleFavorite}
            />
          }
        />

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            title={t('errors.unknown')}
            subtitle={(error as any)?.message ?? ''}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Map + Branches */}
            <BranchMapBlock locations={tenantData?.locations ?? []} />
            <BranchesSection locations={tenantData?.locations ?? []} userLoc={userLoc} />

            {/* Cards */}
            <Text className="mb-3 mt-5 text-sm font-bold text-gray-900">
              {t('cards.cards_title')}
            </Text>
            <View style={{ gap: 16 }}>
              {(tenantData?.cards ?? []).map((tpl) => (
                <TenantCardItem
                  key={tpl.template_id}
                  template={tpl}
                  tenantName={tenantName}
                  tenantLogo={tenantData?.tenant?.logo_url ?? null}
                  onPress={() => {
                    if (tpl.subscribed && tpl.issued_serial) {
                      const fullCard = groups
                        .flatMap((g) => g.cards)
                        .find((c) => c.serial === tpl.issued_serial);
                      if (fullCard) {
                        setSheetCard({ card: fullCard, tenant: tenantData?.tenant ?? null });
                      }
                    }
                  }}
                  onSubscribe={() => handleSubscribe(tpl.template_id)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </ScreenContainer>

      <CardDetailsSheet
        card={sheetCard?.card ?? null}
        tenant={sheetCard?.tenant ?? null}
        visible={sheetCard !== null}
        onClose={() => setSheetCard(null)}
      />
    </SafeAreaView>
  );
}

/* ─── Card template item ─── */

function TenantCardItem({
  template, tenantName, tenantLogo, onPress, onSubscribe,
}: {
  template: TenantCardTemplate;
  tenantName: string;
  tenantLogo: string | null;
  onPress: () => void;
  onSubscribe: () => void;
}) {
  const { t } = useTranslation();
  const [subscribing, setSubscribing] = useState(false);

  return (
    <View>
      <Pressable
        onPress={template.subscribed ? onPress : undefined}
        style={{ opacity: template.subscribed ? 1 : 0.6 }}
      >
        <CardVisual
          design={template.design}
          title={template.name ?? tenantName}
          collectedStamps={template.stamps_count}
          customerName=""
          serial={template.issued_serial ?? `tpl-${template.template_id}`}
          stampsRequired={template.stamps_required ?? undefined}
          brandLogoUrl={tenantLogo}
          compact
        />
      </Pressable>

      <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
        {template.subscribed ? (
          <View
            className="flex-row items-center rounded-full border px-4 py-1.5"
            style={{ gap: 5, borderColor: colors.state.success, backgroundColor: colors.state.successTint }}
          >
            <Check color={colors.state.success} size={14} strokeWidth={2.5} />
            <Text className="text-xs" style={{ color: colors.state.success }}>
              {t('cards.subscribed')}
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={async () => {
                if (subscribing) return;
                setSubscribing(true);
                try { await onSubscribe(); } finally { setSubscribing(false); }
              }}
              disabled={subscribing}
              className="flex-row items-center rounded-full border border-gray-300 px-4 py-1.5"
              style={{ gap: 5, opacity: subscribing ? 0.5 : 1 }}
            >
              {subscribing ? (
                <ActivityIndicator size={14} color={colors.ink.secondary} />
              ) : (
                <Plus color={colors.ink.secondary} size={14} strokeWidth={2} />
              )}
              <Text className="text-xs" style={{ color: colors.ink.secondary }}>
                {t('cards.subscribe')}
              </Text>
            </Pressable>
            <Text className="text-3xs text-gray-400">{t('cards.subscribe_now_hint')}</Text>
          </>
        )}
      </View>
    </View>
  );
}

/* ─── Branches section ─── */

function BranchesSection({ locations, userLoc }: { locations: TenantLocation[]; userLoc: { lat: number; lng: number } | null }) {
  const { t } = useTranslation();
  if (locations.length === 0) return null;

  const sorted = [...locations].map((loc) => {
    const dist = userLoc && loc.lat && loc.lng
      ? haversineKm(userLoc.lat, userLoc.lng, loc.lat, loc.lng)
      : null;
    return { ...loc, _dist: dist };
  }).sort((a, b) => (a._dist ?? Infinity) - (b._dist ?? Infinity));

  return (
    <View>
      <Text className="mb-3 text-sm font-bold text-gray-900">{t('cards.branches_title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {sorted.map((loc) => (
          <View key={loc.id} className={`${surfaces.card} p-3`} style={[shadows.card, { width: 200 }]}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <MapPin color={colors.brand.DEFAULT} size={14} strokeWidth={2} />
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{loc.name}</Text>
            </View>
            {loc.address ? <Text className="mt-1 text-xs text-gray-500" numberOfLines={2}>{loc.address}</Text> : null}
            {loc._dist != null ? <Text className="mt-1 text-3xs text-gray-400">{loc._dist.toFixed(1)} {t('cards.km')}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
