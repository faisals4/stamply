import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Search, ScanLine, Plus, Minus, Gift, RotateCcw,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { PrimaryButton } from '../../components/PrimaryButton';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { merchantApi } from '../lib/merchant-auth';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';

interface CashierCard {
  serial_number: string;
  stamps_count: number;
  status: string;
  customer: { id: number; phone: string; name: string };
  template: {
    id: number;
    name: string;
    rewards: { id: number; name: string; stamps_required: number; can_redeem: boolean }[];
  };
}

export function MerchantScannerScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const [serial, setSerial] = useState('');
  const [card, setCard] = useState<CashierCard | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleLookup = async () => {
    if (!serial.trim()) return;
    setIsLooking(true);
    try {
      const res = await merchantApi.cashierLookup(serial.trim().toUpperCase());
      setCard(res.data);
    } catch (e: any) {
      Alert.alert(t('merchant.scanner_not_found'), e.message);
    } finally {
      setIsLooking(false);
    }
  };

  const handleStamp = async (count: number) => {
    if (!card) return;
    try {
      const res = await merchantApi.cashierStamp(card.serial_number, count);
      setCard(res.data);
      showSuccess(t('merchant.stamp_added', { count }));
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message);
    }
  };

  const handleRemoveStamp = async (count: number) => {
    if (!card) return;
    try {
      const res = await merchantApi.cashierRemoveStamp(card.serial_number, count);
      setCard(res.data);
      showSuccess(t('merchant.stamp_removed', { count }));
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message);
    }
  };

  const handleRedeem = async (rewardId: number, rewardName: string) => {
    if (!card) return;
    try {
      const res = await merchantApi.cashierRedeem(card.serial_number, rewardId);
      setCard(res.data);
      showSuccess(t('merchant.reward_redeemed', { name: rewardName }));
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message);
    }
  };

  const { menuButton, drawer } = useMerchantDrawer('scanner');

  const reset = () => {
    setCard(null);
    setSerial('');
    setSuccessMsg('');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar title={t('merchant.scanner_page_title')} onBack={() => router.back()} endAction={menuButton} />

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          {!card ? (
            /* ═══ Lookup State ═══ */
            <View className="items-center py-8" style={{ gap: 20 }}>
              <ScanLine color={colors.ink.tertiary} size={48} strokeWidth={1} />
              <Text style={localeDirStyle} className="text-center text-sm text-gray-500">
                {t('merchant.scanner_hint')}
              </Text>
              <View className="w-full" style={{ gap: 10 }}>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14,
                    height: 48, paddingHorizontal: 16, fontSize: 16,
                    fontFamily: 'monospace', textAlign: 'center',
                    textTransform: 'uppercase', color: colors.ink.primary,
                    direction: 'ltr',
                  }}
                  value={serial}
                  onChangeText={setSerial}
                  placeholder={t('merchant.scanner_placeholder')}
                  placeholderTextColor={colors.ink.tertiary}
                  autoCapitalize="characters"
                  onSubmitEditing={handleLookup}
                />
                <PrimaryButton
                  label={t('merchant.scanner_search')}
                  icon={<Search color={colors.white} size={18} strokeWidth={2} />}
                  onPress={handleLookup}
                  loading={isLooking}
                  disabled={!serial.trim()}
                />
              </View>
            </View>
          ) : (
            /* ═══ Card Found State ═══ */
            <View style={{ gap: 16 }}>
              {/* Success toast */}
              {successMsg ? (
                <View className="rounded-xl px-4 py-2" style={{ backgroundColor: colors.state.successTint }}>
                  <Text className="text-center text-sm font-bold" style={{ color: colors.state.success }}>{successMsg}</Text>
                </View>
              ) : null}

              {/* Customer info */}
              <View className={`${surfaces.card} p-4`} style={{ gap: 8 }}>
                <Text style={localeDirStyle} className="text-start text-base font-bold text-gray-900">
                  {card.customer.name}
                </Text>
                <Text style={{ direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }} className="text-sm text-gray-500">
                  {card.customer.phone}
                </Text>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View className="rounded-full bg-brand-50 px-3 py-1">
                    <Text className="text-sm font-bold" style={{ color: colors.brand.DEFAULT }}>
                      {card.stamps_count} {t('merchant.stamps_label')}
                    </Text>
                  </View>
                  <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
                    {card.template.name}
                  </Text>
                </View>
              </View>

              {/* Add stamps */}
              <SectionBlock title={t('merchant.add_stamps')} icon={<Plus color={colors.state.success} size={18} strokeWidth={2} />}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {[1, 2, 3, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => handleStamp(n)}
                      className="flex-1 items-center rounded-xl border py-3"
                      style={{ borderColor: colors.state.successTint, backgroundColor: colors.state.successTint }}
                    >
                      <Text className="text-sm font-bold" style={{ color: colors.state.success }}>+{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </SectionBlock>

              {/* Remove stamps */}
              <SectionBlock title={t('merchant.remove_stamps')} icon={<Minus color={colors.state.danger} size={18} strokeWidth={2} />}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {[1, 2, 3, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => handleRemoveStamp(n)}
                      disabled={card.stamps_count < n}
                      className="flex-1 items-center rounded-xl border py-3"
                      style={{ borderColor: colors.state.dangerTint, backgroundColor: colors.state.dangerTint, opacity: card.stamps_count < n ? 0.3 : 1 }}
                    >
                      <Text className="text-sm font-bold" style={{ color: colors.state.danger }}>-{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </SectionBlock>

              {/* Rewards */}
              {card.template.rewards.length > 0 && (
                <SectionBlock title={t('merchant.rewards_title')} icon={<Gift color={colors.state.warning} size={18} strokeWidth={2} />}>
                  <View style={{ gap: 8 }}>
                    {card.template.rewards.map((rw) => (
                      <View key={rw.id} className={`flex-row items-center justify-between ${surfaces.card} px-4 py-3`}>
                        <View className="flex-1" style={{ gap: 2 }}>
                          <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">{rw.name}</Text>
                          <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
                            {rw.stamps_required} {t('merchant.stamps_label')}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRedeem(rw.id, rw.name)}
                          disabled={!rw.can_redeem}
                          className="rounded-xl px-4 py-2"
                          style={{
                            backgroundColor: rw.can_redeem ? colors.state.success : colors.ink.softBorder,
                            opacity: rw.can_redeem ? 1 : 0.5,
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: rw.can_redeem ? colors.white : colors.ink.tertiary }}
                          >
                            {rw.can_redeem ? t('merchant.redeem') : t('merchant.unavailable')}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </SectionBlock>
              )}

              {/* Reset button */}
              <PrimaryButton
                label={t('merchant.another_card')}
                variant="ghost"
                icon={<RotateCcw color={colors.brand.DEFAULT} size={16} strokeWidth={2} />}
                onPress={reset}
              />
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
      {drawer}
    </SafeAreaView>
  );
}

function SectionBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {icon}
        <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">{title}</Text>
      </View>
      {children}
    </View>
  );
}
