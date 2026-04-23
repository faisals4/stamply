import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Modal, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import {
  LogOut, Menu, ChevronLeft, ChevronRight,
  LayoutDashboard, CreditCard, Users, ScanLine, Send,
  Smartphone, Zap, MapPin, UserCog, BarChart3, Settings, Crown,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL, useLayoutRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { CircleButton } from '../../components/ui/CircleButton';
import { useMerchantAuth } from '../lib/merchant-auth';

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
  { key: 'subscription', icon: Crown, labelKey: 'merchant.menu_subscription' },
  { key: 'settings', icon: Settings, labelKey: 'merchant.menu_settings' },
] as const;

/** Web admin paths for each menu section */
const WEB_PATHS: Record<string, string> = {
  dashboard: '/admin',
  cards: '/admin/cards',
  customers: '/admin/customers',
  scanner: '/admin/scan',
  messages: '/admin/messages',
  wallet: '/admin/wallet/announce',
  automations: '/admin/automations',
  locations: '/admin/locations',
  staff: '/admin/managers',
  reports: '/admin/reports',
  subscription: '/admin/subscription',
  settings: '/admin/settings',
};

/**
 * Shared side drawer for all merchant screens.
 *
 * Usage:
 * ```tsx
 * const { menuButton, drawer } = useMerchantDrawer('cards');
 * // put menuButton in HeaderBar endAction
 * // put drawer at the end of the component tree
 * ```
 */
export function useMerchantDrawer(activeKey?: string) {
  const [open, setOpen] = useState(false);

  const menuButton = (
    <CircleButton
      onPress={() => setOpen(true)}
      icon={<Menu color={colors.navIcon} size={20} strokeWidth={2} />}
    />
  );

  const drawer = (
    <MerchantDrawerModal
      visible={open}
      onClose={() => setOpen(false)}
      activeKey={activeKey}
    />
  );

  return { menuButton, drawer, setMenuOpen: setOpen };
}

function MerchantDrawerModal({
  visible,
  onClose,
  activeKey,
}: {
  visible: boolean;
  onClose: () => void;
  activeKey?: string;
}) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const { user, logout } = useMerchantAuth();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const DRAWER_WIDTH = 280;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => onClose());
  };

  const navigate = (key: string) => {
    handleClose();
    const path = WEB_PATHS[key];
    if (path) {
      const labelKey = MENU_ITEMS.find((m) => m.key === key)?.labelKey ?? '';
      router.push(`/merchant-web?url=${encodeURIComponent(path)}&title=${encodeURIComponent(t(labelKey))}&activeKey=${key}` as any);
    }
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    router.replace('/for-business' as any);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isRTL ? [-DRAWER_WIDTH, 0] : [DRAWER_WIDTH, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="auto"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropAnim }}
        >
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute', top: 0, bottom: 0,
            [isRTL ? 'left' : 'right']: 0,
            width: DRAWER_WIDTH, backgroundColor: '#FFFFFF',
            transform: [{ translateX }],
            ...(Platform.OS === 'web' ? { boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' } as any : {}),
          }}
        >
          {/* Back to Stamply + user info */}
          <View className="border-b border-gray-100 px-5 pb-4 pt-6" style={{ gap: 10 }}>
            <Pressable
              onPress={() => {
                handleClose();
                router.replace('/(tabs)/settings' as any);
              }}
              className="flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-2"
              style={{ gap: 6 }}
            >
              {isRTL
                ? <ChevronRight color={colors.ink.secondary} size={16} strokeWidth={2} />
                : <ChevronLeft color={colors.ink.secondary} size={16} strokeWidth={2} />
              }
              <Text className="text-xs text-gray-500">{t('merchant.back_to_stamply')}</Text>
              <Text className="text-xs font-bold" style={{ color: colors.brand.DEFAULT }}>Stamply</Text>
            </Pressable>
            {user && <Text style={localeDirStyle} className="text-start text-sm text-gray-500">{user.name}</Text>}
          </View>

          {/* Menu items */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeKey;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => navigate(item.key)}
                  className="flex-row items-center px-5 py-3"
                  style={{ gap: 12, backgroundColor: isActive ? colors.brand[50] : 'transparent' }}
                >
                  <Icon color={isActive ? colors.brand.DEFAULT : colors.ink.secondary} size={20} strokeWidth={1.5} />
                  <Text
                    style={[localeDirStyle, { color: isActive ? colors.brand.DEFAULT : colors.ink.primary }]}
                    className={`flex-1 text-start text-sm ${isActive ? 'font-bold' : ''}`}
                    numberOfLines={1}
                  >
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Logout */}
          <View className="border-t border-gray-100 px-5 py-4">
            <Pressable onPress={handleLogout} className="flex-row items-center" style={{ gap: 12 }}>
              <LogOut color={colors.state.danger} size={20} strokeWidth={1.5} />
              <Text className="text-sm" style={{ color: colors.state.danger }}>{t('settings.logout')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
