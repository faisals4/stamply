import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ScreenContainer } from '../ScreenContainer';
import { HeaderBar } from '../ui/HeaderBar';

/**
 * "لأصحاب الأعمال" intro screen — accessible from the Settings
 * (المزيد) tab. Presents the Stamply business value proposition
 * with stats, features, and floating login/signup CTAs.
 *
 * Content is sourced from the Stamply landing page
 * (`web/src/pages/landing/Landing.tsx`).
 */
export function ForBusinessScreen() {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        {/* Fixed nav bar */}
        <HeaderBar
          title="Stamply"
          onBack={() => router.back()}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="px-5 pt-6" style={{ gap: 12 }}>
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
          <View
            className="mx-5 mt-6 flex-row"
            style={{ gap: 8 }}
          >
            <StatCard
              value="40%"
              label={t('for_business.stat_retention')}
              icon={<TrendingUp color={colors.brand.DEFAULT} size={18} strokeWidth={2} />}
            />
            <StatCard
              value="30%"
              label={t('for_business.stat_conversion')}
              icon={<UserCheck color={colors.brand.DEFAULT} size={18} strokeWidth={2} />}
            />
            <StatCard
              value="70%"
              label={t('for_business.stat_personalization')}
              icon={<Heart color={colors.brand.DEFAULT} size={18} strokeWidth={2} />}
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

          {/* Features grid */}
          <View className="mx-5 mt-6" style={{ gap: 8 }}>
            <Text
              style={localeDirStyle}
              className="text-start text-lg font-bold text-gray-900"
            >
              {t('for_business.features_title')}
            </Text>
            <View style={{ gap: 10 }}>
              <FeatureRow
                icon={<Palette color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_editor')}
              />
              <FeatureRow
                icon={<Users color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_customers')}
              />
              <FeatureRow
                icon={<ScanLine color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_scanner')}
              />
              <FeatureRow
                icon={<Send color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_messaging')}
              />
              <FeatureRow
                icon={<MapPin color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_branches')}
              />
              <FeatureRow
                icon={<ShieldCheck color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_security')}
              />
              <FeatureRow
                icon={<BarChart3 color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_reports')}
              />
              <FeatureRow
                icon={<Smartphone color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                title={t('for_business.feature_wallet')}
              />
            </View>
          </View>
        </ScrollView>

        {/* Floating CTAs — pinned to bottom, above the scroll */}
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
              ? ({
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                } as any)
              : null,
          ]}
        >
          <Pressable
            onPress={() => {
              /* TODO: merchant login */
            }}
            className="flex-1 items-center justify-center rounded-2xl border border-gray-200"
            style={{ height: 48 }}
          >
            <Text className="text-sm text-gray-900">
              {t('for_business.login')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              /* TODO: merchant signup */
            }}
            className="flex-1 items-center justify-center rounded-2xl"
            style={{ height: 48, backgroundColor: colors.brand.DEFAULT }}
          >
            <Text className="text-sm text-white">
              {t('for_business.signup')}
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}

/** Single stat card in the 3-column row. */
function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl bg-gray-50 p-3"
      style={{ gap: 4 }}
    >
      {icon}
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-center text-3xs text-gray-500">{label}</Text>
    </View>
  );
}

/** Single feature row with icon + label. */
function FeatureRow({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View
      className="flex-row items-center rounded-2xl bg-gray-50 px-4 py-3"
      style={{ gap: 12 }}
    >
      {icon}
      <Text
        style={localeDirStyle}
        className="flex-1 text-start text-sm text-gray-900"
      >
        {title}
      </Text>
    </View>
  );
}
