import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Users, Search, X, CreditCard,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { SearchModal } from '../../components/ui/SearchModal';
import { CategoryChips } from '../../components/stores/CategoryChips';
import { merchantApi } from '../lib/merchant-auth';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';

interface Customer {
  id: number;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  issued_cards_count: number;
  last_activity_at: string | null;
}

const FILTERS = [
  { key: '', labelKey: 'merchant.filter_all' },
  { key: 'active_week', labelKey: 'merchant.filter_active_week' },
  { key: 'active', labelKey: 'merchant.filter_active' },
  { key: 'inactive', labelKey: 'merchant.filter_inactive' },
  { key: 'new', labelKey: 'merchant.filter_new' },
  { key: 'new_month', labelKey: 'merchant.filter_new_month' },
  { key: 'birthday_week', labelKey: 'merchant.filter_birthday_week' },
  { key: 'birthday_month', labelKey: 'merchant.filter_birthday_month' },
] as const;

export function MerchantCustomersScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { menuButton, drawer } = useMerchantDrawer('customers');

  const params: Record<string, string> = { per_page: '25', page: String(page) };
  if (search.trim()) params.q = search.trim();
  if (filter) params.filter = filter;

  // Separate query for the SearchModal live results
  const { data: searchResults } = useQuery({
    queryKey: ['merchant', 'customers-search', searchQuery],
    queryFn: async () => {
      const res = await merchantApi.listCustomers({ q: searchQuery, per_page: '10' });
      return res.data as Customer[];
    },
    enabled: searchOpen && searchQuery.trim().length > 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['merchant', 'customers', params],
    queryFn: async () => {
      const res = await merchantApi.listCustomers(params);
      return { customers: res.data as Customer[], meta: res.meta };
    },
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar title={t('merchant.customers_page_title')} onBack={() => router.back()} endAction={menuButton} />

        {/* Search trigger — same style as StoresScreen */}
        <Pressable
          onPress={() => setSearchOpen(true)}
          className={`mx-4 mb-4 mt-2 flex-row items-center ${surfaces.card} px-4 py-3`}
        >
          <Search color={colors.ink.tertiary} size={18} strokeWidth={1.6} />
          <Text className="ms-3 flex-1 text-start text-sm text-gray-400">
            {search || t('merchant.customers_search')}
          </Text>
          {search ? (
            <Pressable onPress={() => { setSearch(''); setPage(1); }} hitSlop={8}>
              <X color={colors.ink.tertiary} size={16} strokeWidth={2} />
            </Pressable>
          ) : null}
        </Pressable>

        {/* Search modal */}
        <SearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          placeholder={t('merchant.customers_search')}
          onSearch={setSearchQuery}
          items={searchResults ?? []}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSearchOpen(false);
                setSearch(item.full_name);
                setPage(1);
                router.push(`/merchant-customer-detail?id=${item.id}` as any);
              }}
              className={`flex-row items-center ${surfaces.card} mb-2 px-4 py-3`}
              style={{ gap: 12 }}
            >
              <View className="items-center justify-center rounded-full bg-gray-100" style={{ width: 40, height: 40 }}>
                <Text className="text-sm font-bold text-gray-500">
                  {(item.full_name || '?').charAt(0)}
                </Text>
              </View>
              <View className="flex-1" style={{ gap: 2 }}>
                <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">{item.full_name}</Text>
                <Text style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} className="text-xs text-gray-400">{item.phone || item.email || '—'}</Text>
              </View>
            </Pressable>
          )}
          emptyText={t('merchant.customers_empty')}
        />

        {/* Filters */}
        <View style={{ flexGrow: 0 }}>
          <CategoryChips
            categories={FILTERS.map((f) => t(f.labelKey))}
            active={t(FILTERS.find((f) => f.key === filter)?.labelKey ?? FILTERS[0].labelKey)}
            onSelect={(label) => {
              const found = FILTERS.find((f) => t(f.labelKey) === label);
              if (found) { setFilter(found.key); setPage(1); }
            }}
          />
        </View>

        {/* Customer list */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
            {data?.customers && data.customers.length > 0 ? (
              <>
                {data.customers.map((customer) => (
                  <Pressable
                    key={customer.id}
                    onPress={() => router.push(`/merchant-customer-detail?id=${customer.id}` as any)}
                    className={`flex-row items-center ${surfaces.card} px-4 py-3`}
                    style={{ gap: 12 }}
                  >
                    {/* Avatar */}
                    <View className="items-center justify-center rounded-full bg-gray-100" style={{ width: 40, height: 40 }}>
                      <Text className="text-sm font-bold text-gray-500">
                        {(customer.full_name || '?').charAt(0)}
                      </Text>
                    </View>
                    {/* Info */}
                    <View className="flex-1" style={{ gap: 2 }}>
                      <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900" numberOfLines={1}>
                        {customer.full_name}
                      </Text>
                      <Text style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} className="text-xs text-gray-400" numberOfLines={1}>
                        {customer.phone || customer.email || '—'}
                      </Text>
                    </View>
                    {/* Cards count */}
                    <View className="flex-row items-center" style={{ gap: 4 }}>
                      <CreditCard color={colors.ink.tertiary} size={14} strokeWidth={1.5} />
                      <Text className="text-xs text-gray-400">{customer.issued_cards_count}</Text>
                    </View>
                    {/* Last activity */}
                    <Text className="text-3xs text-gray-300">{formatDate(customer.last_activity_at)}</Text>
                  </Pressable>
                ))}

                {/* Pagination */}
                {data.meta && data.meta.last_page > 1 && (
                  <View className="flex-row items-center justify-center py-4" style={{ gap: 12 }}>
                    <Pressable
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-xl border border-gray-200 px-4 py-2"
                      style={{ opacity: page <= 1 ? 0.3 : 1 }}
                    >
                      <Text className="text-xs text-gray-600">{t('merchant.prev_page')}</Text>
                    </Pressable>
                    <Text className="text-xs text-gray-400">{page} / {data.meta.last_page}</Text>
                    <Pressable
                      onPress={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                      disabled={page >= data.meta.last_page}
                      className="rounded-xl border border-gray-200 px-4 py-2"
                      style={{ opacity: page >= data.meta.last_page ? 0.3 : 1 }}
                    >
                      <Text className="text-xs text-gray-600">{t('merchant.next_page')}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <View className="items-center py-12" style={{ gap: 8 }}>
                <Users color={colors.ink.tertiary} size={40} strokeWidth={1} />
                <Text style={localeDirStyle} className="text-center text-sm text-gray-400">
                  {t('merchant.customers_empty')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
      {drawer}
    </SafeAreaView>
  );
}
