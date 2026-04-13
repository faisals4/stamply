import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Lock, CreditCard, Save,
  Stamp as StampIcon, Gift, Calendar,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { PrimaryButton } from '../../components/PrimaryButton';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CircleButton } from '../../components/ui/CircleButton';
import { FormInput } from '../../components/ui/FormInput';
import { merchantApi } from '../lib/merchant-auth';

interface CustomerDetail {
  id: number;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  birthdate: string | null;
  gender: string | null;
  phone_verified_at: string | null;
  locked_fields: string[];
  stats: {
    cards_count: number;
    total_stamps_earned: number;
    total_rewards_redeemed: number;
    days_since_signup: number | null;
  };
  issued_cards: {
    id: number;
    serial_number: string;
    stamps_count: number;
    status: string;
    template: { id: number; name: string };
    stats: { stamps_earned: number; rewards_redeemed: number };
  }[];
}

export function MerchantCustomerDetailScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    birthdate: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['merchant', 'customer', id],
    queryFn: async () => {
      const res = await merchantApi.getCustomer(id!);
      return res.data as CustomerDetail;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      setForm({
        first_name: customer.first_name ?? '',
        last_name: customer.last_name ?? '',
        email: customer.email ?? '',
        birthdate: customer.birthdate ?? '',
      });
    }
  }, [customer]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await merchantApi.updateCustomer(id, form);
      queryClient.invalidateQueries({ queryKey: ['merchant', 'customer', id] });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'customers'] });
      Alert.alert(t('merchant.customer_saved'));
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isLocked = (field: string) => customer?.locked_fields?.includes(field);
  const isPhoneLocked = !!customer?.phone_verified_at;

  if (isLoading || !customer) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 items-center justify-center bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-100 bg-white px-4" style={{ height: 56, gap: 8 }}>
          <CircleButton
            onPress={() => router.back()}
            icon={isRTL ? <ChevronRight color={colors.navIcon} size={20} strokeWidth={2} /> : <ChevronLeft color={colors.navIcon} size={20} strokeWidth={2} />}
          />
          <Text className="flex-1 text-center text-sm font-bold text-gray-900" numberOfLines={1}>
            {customer.full_name}
          </Text>
          <PrimaryButton
            label={t('merchant.save')}
            icon={<Save color={colors.white} size={14} strokeWidth={2} />}
            onPress={handleSave}
            loading={isSaving}
          />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          {/* ═══ Stats ═══ */}
          <View className="flex-row" style={{ gap: 8 }}>
            <StatMini icon={<CreditCard color={colors.brand.DEFAULT} size={16} strokeWidth={1.5} />} value={customer.stats.cards_count} label={t('merchant.stat_cards_short')} />
            <StatMini icon={<StampIcon color={colors.state.warning} size={16} strokeWidth={1.5} />} value={customer.stats.total_stamps_earned} label={t('merchant.stat_stamps_total')} />
            <StatMini icon={<Gift color={colors.state.success} size={16} strokeWidth={1.5} />} value={customer.stats.total_rewards_redeemed} label={t('merchant.stat_rewards_short')} />
            <StatMini icon={<Calendar color={colors.ink.secondary} size={16} strokeWidth={1.5} />} value={Math.min(customer.stats.days_since_signup ?? 0, 9999)} label={t('merchant.stat_days')} />
          </View>

          {/* ═══ Profile ═══ */}
          <View className={`${surfaces.card} p-4`} style={{ gap: 12 }}>
            <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
              {t('merchant.profile_title')}
            </Text>

            <View className="flex-row" style={{ gap: 10 }}>
              <ProfileField
                label={t('merchant.first_name')}
                value={form.first_name}
                locked={isLocked('first_name')}
                onChangeText={(v) => setForm((p) => ({ ...p, first_name: v }))}
              />
              <ProfileField
                label={t('merchant.last_name')}
                value={form.last_name}
                locked={isLocked('last_name')}
                onChangeText={(v) => setForm((p) => ({ ...p, last_name: v }))}
              />
            </View>

            <ProfileField
              label={t('merchant.phone')}
              value={customer.phone ?? ''}
              locked={isPhoneLocked}
              ltr
            />
            <ProfileField
              label={t('merchant.email')}
              value={form.email}
              locked={isLocked('email')}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              keyboardType="email-address"
            />
            <View className="flex-row" style={{ gap: 10 }}>
              <ProfileField
                label={t('merchant.birthdate')}
                value={form.birthdate}
                locked={isLocked('birthdate')}
                onChangeText={(v) => setForm((p) => ({ ...p, birthdate: v }))}
                placeholder="YYYY-MM-DD"
                ltr
              />
              <ProfileField
                label={t('merchant.gender')}
                value={customer.gender === 'male' ? t('profile.gender_male') : customer.gender === 'female' ? t('profile.gender_female') : '—'}
                locked
              />
            </View>
          </View>

          {/* ═══ Issued Cards ═══ */}
          <View style={{ gap: 8 }}>
            <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
              {t('merchant.issued_cards_title')} ({customer.issued_cards.length})
            </Text>
            {customer.issued_cards.map((card) => (
              <View key={card.id} className="flex-row items-center rounded-xl border border-gray-100 px-4 py-3" style={{ gap: 10 }}>
                <CreditCard color={colors.ink.tertiary} size={18} strokeWidth={1.5} />
                <View className="flex-1" style={{ gap: 2 }}>
                  <Text style={localeDirStyle} className="text-start text-sm text-gray-900">{card.template.name}</Text>
                  <Text style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} className="text-3xs text-gray-400 font-mono">
                    {card.serial_number}
                  </Text>
                </View>
                <View className="items-end" style={{ gap: 2 }}>
                  <Text className="text-sm font-bold" style={{ color: colors.brand.DEFAULT }}>
                    {card.stamps_count}
                  </Text>
                  <Text className="text-3xs text-gray-400">{t('merchant.stamps_label')}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function StatMini({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View className="flex-1 items-center rounded-xl bg-gray-50 py-3" style={{ gap: 4 }}>
      {icon}
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text style={localeDirStyle} className="text-center text-3xs text-gray-400">{label}</Text>
    </View>
  );
}

const ProfileField = FormInput;
