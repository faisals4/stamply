import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CreditCard,
  Stamp,
  Gift,
  TrendingUp,
  Calendar,
  LogOut,
  Menu,
  LayoutDashboard,
  ScanLine,
  Send,
  Smartphone,
  Zap,
  MapPin,
  UserCog,
  BarChart3,
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Wallet,
  Cake,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CircleButton } from '../../components/ui/CircleButton';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { surfaces } from '../../lib/surfaces';
import { useMerchantAuth, merchantApi, type DashboardStats, type ReachSummary } from '../lib/merchant-auth';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';

/**
 * Merchant dashboard — the first screen after merchant login.
 * Shows the same stats as the web admin dashboard at `/admin/`.
 *
 * Stats are fetched from `GET /api/dashboard/stats` using the
 * merchant's own bearer token (separate from the customer token).
 * Refetches every 30 seconds.
 */
const MENU_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, labelKey: 'merchant.menu_dashboard' },
  { key: 'cards', icon: CreditCard, labelKey: 'merchant.menu_cards' },
  { key: 'customers', icon: Users, labelKey: 'merchant.menu_customers' },
  { key: 'scanner', icon: ScanLine, labelKey: 'merchant.menu_scanner' },
  { key: 'messages', icon: Send, labelKey: 'merchant.menu_messages' },
  { key: 'wallet', icon: Smartphone, labelKey: 'merchant.menu_wallet' },
  { key: 'automations', icon: Zap, labelKey: 'merchant.menu_automations' },
  { key: 'locations', icon: MapPin, labelKey: 'merchant.menu_locations' },
  { key: 'staff', icon: UserCog, labelKey: 'merchant.menu_staff' },
  { key: 'reports', icon: BarChart3, labelKey: 'merchant.menu_reports' },
  { key: 'settings', icon: Settings, labelKey: 'merchant.menu_settings' },
] as const;

export function MerchantDashboardScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const { user, logout } = useMerchantAuth();
  const { menuButton, drawer } = useMerchantDrawer('dashboard');

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['merchant', 'dashboard-stats'],
    queryFn: async () => (await merchantApi.dashboardStats()).data,
    refetchInterval: 30_000,
  });

  const { data: reach } = useQuery<ReachSummary>({
    queryKey: ['merchant', 'messages-reach'],
    queryFn: async () => (await merchantApi.messagesReach()).data,
    refetchInterval: 30_000,
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/for-business' as any);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenContainer>
        <HeaderBar
          title={t('merchant.dashboard_title')}
          onBack={() => router.replace('/(tabs)/settings' as any)}
          backIcon={<X color={colors.navIcon} size={20} strokeWidth={2} />}
          endAction={menuButton}
        />

        {isLoading || !stats ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ═══ Welcome ═══ */}
            <View>
              <Text style={localeDirStyle} className="text-start text-lg font-bold text-gray-900">
                {t('merchant.welcome', { name: user?.name ?? '' })}
              </Text>
              <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
                {t('merchant.dashboard_title')}
              </Text>
            </View>

            {/* ═══ Row 1: إجمالي العملاء | البطاقات المُصدَرة ═══ */}
            <View className="flex-row" style={{ gap: 10 }}>
              <StatTile
                icon={<Users color={colors.brand.DEFAULT} size={22} strokeWidth={1.5} />}
                iconBg={colors.brand[50]}
                value={stats.customers}
                label={t('merchant.stat_customers')}
              />
              <StatTile
                icon={<CreditCard color={colors.brand.DEFAULT} size={22} strokeWidth={1.5} />}
                iconBg={colors.brand[50]}
                value={stats.issued_cards}
                label={t('merchant.stat_cards')}
                sub={`↗ ${stats.active_cards} ${t('merchant.stat_active_template')}`}
              />
            </View>

            {/* ═══ Row 2: أختام اليوم | مكافآت مستبدلة ═══ */}
            <View className="flex-row" style={{ gap: 10 }}>
              <StatTile
                icon={<Stamp color={colors.state.warning} size={22} strokeWidth={1.5} />}
                iconBg={colors.state.warningTint}
                value={stats.stamps_today}
                label={t('merchant.stat_stamps_today')}
                sub={`↗ ${stats.stamps_week} ${t('merchant.stat_this_week')}`}
              />
              <StatTile
                icon={<Gift color={colors.state.success} size={22} strokeWidth={1.5} />}
                iconBg={colors.state.successTint}
                value={stats.total_rewards_redeemed}
                label={t('merchant.stat_rewards')}
              />
            </View>

            {/* ═══ مدى الوصول للحملات ═══ */}
            <View className="mt-2 flex-row items-center justify-between">
              <Text
                style={localeDirStyle}
                className="text-start text-base font-bold text-gray-900"
              >
                {t('merchant.reach_title')}
              </Text>
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Users color={colors.ink.tertiary} size={14} strokeWidth={1.5} />
                <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
                  {reach?.total_customers ?? stats.customers} {t('merchant.reach_total')}
                </Text>
              </View>
            </View>

            {/* Row: Apple Wallet | تنبيهات المتصفّح */}
            <View className="flex-row" style={{ gap: 10 }}>
              <ReachTile
                icon={<Wallet color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                iconBg={colors.brand[50]}
                label="Apple Wallet"
                count={reach?.wallet.reachable ?? 0}
                pct={reach?.wallet.percentage ?? 0}
              />
              <ReachTile
                icon={<Bell color={colors.state.warning} size={20} strokeWidth={1.5} />}
                iconBg={colors.state.warningTint}
                label={t('merchant.reach_push')}
                count={reach?.push.reachable ?? 0}
                pct={reach?.push.percentage ?? 0}
              />
            </View>

            {/* Row: البريد | الرسائل النصية */}
            <View className="flex-row" style={{ gap: 10 }}>
              <ReachTile
                icon={<Mail color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />}
                iconBg={colors.brand[50]}
                label={t('merchant.reach_email')}
                count={reach?.email.reachable ?? 0}
                pct={reach?.email.percentage ?? 0}
              />
              <ReachTile
                icon={<MessageSquare color={colors.state.success} size={20} strokeWidth={1.5} />}
                iconBg={colors.state.successTint}
                label={t('merchant.reach_sms')}
                count={reach?.sms.reachable ?? 0}
                pct={reach?.sms.percentage ?? 0}
              />
            </View>

            {/* ═══ النشاط الأسبوعي ═══ */}
            <View
              className={`mt-2 ${surfaces.card} p-4`}
              style={{ gap: 12 }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, backgroundColor: colors.brand[50] }}
                >
                  <TrendingUp color={colors.brand.DEFAULT} size={20} strokeWidth={1.5} />
                </View>
                <Text
                  style={localeDirStyle}
                  className="text-start text-base font-bold text-gray-900"
                >
                  {t('merchant.weekly_title')}
                </Text>
              </View>
              <WeeklyRow
                label={t('merchant.stat_active_weekly')}
                value={stats.active_customers_week}
              />
              <WeeklyRow
                label={t('merchant.stat_new_monthly')}
                value={stats.new_customers_month}
              />
            </View>

            {/* ═══ أعياد الميلاد القادمة ═══ */}
            <View
              className={`mt-2 ${surfaces.card} p-4`}
              style={{ gap: 12 }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, backgroundColor: colors.state.warningTint }}
                >
                  <Cake color={colors.state.warning} size={20} strokeWidth={1.5} />
                </View>
                <Text
                  style={localeDirStyle}
                  className="flex-1 text-start text-base font-bold text-gray-900"
                >
                  {t('merchant.birthdays_title')}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text style={localeDirStyle} className="text-start text-sm text-gray-600">
                  {t('merchant.birthdays_subtitle')}
                </Text>
                <Text className="text-lg font-bold" style={{ color: colors.state.warning }}>
                  {stats.upcoming_birthdays_week}
                </Text>
              </View>
              {stats.upcoming_birthdays_week > 0 ? (
                <Text
                  style={localeDirStyle}
                  className="text-start text-3xs text-gray-400"
                >
                  {t('merchant.birthdays_auto_note')}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        )}
      </ScreenContainer>

      {drawer}
    </SafeAreaView>
  );
}

/** Primary stat tile matching the web admin layout — icon in a
 *  colored circle at top-start, label + big number + optional sub. */
function StatTile({
  icon,
  iconBg,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  value: number;
  label: string;
  sub?: string;
}) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View
      className={`flex-1 ${surfaces.card} p-4`}
      style={{ gap: 4 }}
    >
      <View
        className="mb-1 items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: iconBg ?? colors.ink.softBorder }}
      >
        {icon}
      </View>
      <Text style={localeDirStyle} className="text-start text-xs text-gray-500">
        {label}
      </Text>
      <Text style={localeDirStyle} className="text-start text-2xl font-bold text-gray-900">
        {value}
      </Text>
      {sub ? (
        <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Reach channel tile — icon circle + channel name + count + percentage. */
function ReachTile({
  icon,
  iconBg,
  label,
  count,
  pct,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  count: number;
  pct: number;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View
      className={`flex-1 ${surfaces.card} p-4`}
      style={{ gap: 6 }}
    >
      <View className="flex-row items-center justify-between">
        <Text style={localeDirStyle} className="flex-1 text-start text-xs text-gray-500">
          {label}
        </Text>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 32, height: 32, backgroundColor: iconBg }}
        >
          {icon}
        </View>
      </View>
      <View className="flex-row items-baseline" style={{ gap: 6 }}>
        <Text style={localeDirStyle} className="text-start text-xl font-bold text-gray-900">
          {count}
        </Text>
        <Text className="text-xs" style={{ color: colors.brand.DEFAULT }}>
          {pct}%
        </Text>
      </View>
      <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
        {t('merchant.reach_view_list')}
      </Text>
    </View>
  );
}

/** Single row inside the "Weekly Activity" card — label on start, value on end. */
function WeeklyRow({ label, value }: { label: string; value: number }) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View className="flex-row items-center justify-between">
      <Text style={localeDirStyle} className="text-start text-sm text-gray-600">
        {label}
      </Text>
      <Text className="text-lg font-bold" style={{ color: colors.brand.DEFAULT }}>
        {value}
      </Text>
    </View>
  );
}

