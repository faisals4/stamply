import { useState } from 'react';
import { View, Text, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  Palette,
  Users,
  ScanLine,
  Send,
  MapPin,
  ShieldCheck,
  BarChart3,
  Smartphone,
  TrendingUp,
  UserCheck,
  Heart,
} from 'lucide-react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CircleButton } from '../../components/ui/CircleButton';

/** Stamply brand blue — used only on the for-business page & signup/login modals */
const BLUE = '#eb592e';
import { MerchantLoginSheet } from './MerchantLoginSheet';
import { MerchantSignupSheet } from './MerchantSignupSheet';
import { useMerchantAuth } from '../lib/merchant-auth';

/**
 * "لأصحاب الأعمال" intro screen — accessible from the Settings
 * (المزيد) tab. Presents the Stamply business value proposition
 * with stats, features, and floating login/signup CTAs.
 *
 * All business-related files live under `mobile/business/` so the
 * merchant module stays self-contained and easy to manage
 * independently from the customer app.
 */
export function ForBusinessScreen() {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const isRTL = useIsRTL();
  const { isLoggedIn } = useMerchantAuth();
  const [loginVisible, setLoginVisible] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);

  // If the merchant is already logged in, skip the intro and go
  // straight to the dashboard. This handles the "back from
  // dashboard → re-open for-business → auto-redirect" flow.
  if (isLoggedIn) {
    router.replace('/merchant-dashboard' as any);
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        {/* Nav bar with logo */}
        <View className="flex-row items-center border-b border-gray-100 px-4" style={{ height: 56, gap: 12 }}>
          <CircleButton onPress={() => router.back()} icon={isRTL ? <ChevronRight color={colors.navIcon} size={20} strokeWidth={2} /> : <ChevronLeft color={colors.navIcon} size={20} strokeWidth={2} />} />
          <View className="flex-1 items-center">
            <Image source={require('../../assets/logo-stamply.png')} style={{ height: 28, width: 100 }} resizeMode="contain" />
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner hero */}
          <Image
            source={require('../../assets/banner-hero.png')}
            style={{ width: '100%', height: 180 }}
            resizeMode="cover"
          />

          {/* Hero */}
          <View className="px-5 pt-4" style={{ gap: 12 }}>
            <Text
              style={localeDirStyle}
              className="text-start text-2xl font-bold text-gray-900"
            >
              {t('for_business.hero_title')}
            </Text>
            <Text
              style={localeDirStyle}
              className="text-start text-sm leading-relaxed text-gray-500"
            >
              {t('for_business.hero_description')}
            </Text>
          </View>

          {/* Stats row */}
          <View className="mx-5 mt-6 flex-row" style={{ gap: 8 }}>
            <StatCard
              value="40%"
              label={t('for_business.stat_retention')}
              icon={<TrendingUp color={BLUE} size={18} strokeWidth={2} />}
            />
            <StatCard
              value="30%"
              label={t('for_business.stat_conversion')}
              icon={<UserCheck color={BLUE} size={18} strokeWidth={2} />}
            />
            <StatCard
              value="70%"
              label={t('for_business.stat_personalization')}
              icon={<Heart color={BLUE} size={18} strokeWidth={2} />}
            />
          </View>

          {/* What is Stamply */}
          <View className="mx-5 mt-6" style={{ gap: 8 }}>
            <Text
              style={localeDirStyle}
              className="text-start text-lg font-bold text-gray-900"
            >
              {t('for_business.what_title')}
            </Text>
            <Text
              style={localeDirStyle}
              className="text-start text-sm leading-relaxed text-gray-500"
            >
              {t('for_business.what_description')}
            </Text>
          </View>

          {/* Features — 2 per row */}
          <View className="mx-5 mt-6" style={{ gap: 8 }}>
            <Text
              style={localeDirStyle}
              className="text-start text-lg font-bold text-gray-900"
            >
              {t('for_business.features_title')}
            </Text>
            <View style={{ gap: 10 }}>
              <View className="flex-row" style={{ gap: 10 }}>
                <FeatureRow icon={<Palette color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_editor')} />
                <FeatureRow icon={<Users color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_customers')} />
              </View>
              <View className="flex-row" style={{ gap: 10 }}>
                <FeatureRow icon={<ScanLine color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_scanner')} />
                <FeatureRow icon={<Send color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_messaging')} />
              </View>
              <View className="flex-row" style={{ gap: 10 }}>
                <FeatureRow icon={<MapPin color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_branches')} />
                <FeatureRow icon={<ShieldCheck color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_security')} />
              </View>
              <View className="flex-row" style={{ gap: 10 }}>
                <FeatureRow icon={<BarChart3 color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_reports')} />
                <FeatureRow icon={<Smartphone color={BLUE} size={20} strokeWidth={1.5} />} title={t('for_business.feature_wallet')} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating CTAs */}
        <View
          className="absolute bottom-0 start-0 end-0 flex-row px-5"
          style={[
            {
              paddingTop: 12,
              paddingBottom: 24,
              gap: 10,
              backgroundColor: Platform.OS === 'web'
                ? 'rgba(255, 255, 255, 0.90)'
                : '#FFFFFF',
            },
            Platform.OS === 'web'
              ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any)
              : null,
          ]}
        >
          <View className="flex-1">
            <PrimaryButton
              label={t('for_business.login')}
              variant="ghost"
              color={BLUE}
              onPress={() => setLoginVisible(true)}
            />
          </View>
          <View className="flex-1">
            <PrimaryButton
              label={t('for_business.signup')}
              color={BLUE}
              onPress={() => setSignupVisible(true)}
            />
          </View>
        </View>
      </ScreenContainer>

      <MerchantLoginSheet
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
      />
      <MerchantSignupSheet
        visible={signupVisible}
        onClose={() => setSignupVisible(false)}
      />
    </SafeAreaView>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-gray-50 p-3" style={{ gap: 4 }}>
      {icon}
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-center text-3xs text-gray-500">{label}</Text>
    </View>
  );
}

function FeatureRow({ icon, title }: { icon: React.ReactNode; title: string }) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View className="flex-1 flex-row items-center rounded-2xl bg-gray-50 px-3 py-3" style={{ gap: 8 }}>
      {icon}
      <Text style={localeDirStyle} className="flex-1 text-start text-xs text-gray-900">{title}</Text>
    </View>
  );
}
