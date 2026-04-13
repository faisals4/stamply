import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  ShoppingBag,
  Clock,
  Package,
  Truck,
  CircleCheck,
  CircleX,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Car,
  Navigation,
} from 'lucide-react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { HeaderBar } from '../components/ui/HeaderBar';
import { PillTabs } from '../components/ui/PillTabs';
import { Price } from '../components/stores/detail/Price';
import { useIsRTL } from '../lib/rtl';
import { surfaces } from '../lib/surfaces';
import { shadows } from '../lib/shadows';
import { colors } from '../lib/colors';
import {
  ACTIVE_ORDERS,
  PAST_ORDERS,
  STATUS_CONFIG,
  DELIVERY_TYPE_CONFIG,
} from '../lib/demo/orders-data';
import type {
  ActiveOrder,
  PastOrder,
  OrderStatus,
  DeliveryType,
} from '../lib/demo/orders-data';

/* ─── Helpers ─── */

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ─── Components ─── */

/**
 * Visual 3-step progress: Confirmed → Preparing → Ready/Delivery
 * Layout: [Dot] ─── [Dot] ─── [Dot]
 * Each connector is a simple View with flex-1 and height: 2.
 */
function OrderSteps({
  currentStep,
  deliveryType,
  t,
}: {
  currentStep: number;
  deliveryType: DeliveryType;
  t: (key: string) => string;
}) {
  const lastStepLabel =
    deliveryType === 'delivery'
      ? t('orders.step_delivery')
      : t('orders.step_ready_pickup');

  const LastIcon = deliveryType === 'delivery' ? Truck : MapPin;

  const steps = [
    { label: t('orders.step_confirmed'), Icon: CircleCheck },
    { label: t('orders.step_preparing'), Icon: Package },
    { label: lastStepLabel, Icon: LastIcon },
  ];

  return (
    <View style={{ marginTop: 12 }}>
      {/* Row of dots and connectors */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const dotColor = done
            ? colors.state.success
            : active
              ? '#2563EB'
              : colors.ink.divider;

          const connectorDone = i <= currentStep && i > 0;

          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: i === 0 ? 0 : 1,
              }}
            >
              {/* Connector line before this dot (skip first) */}
              {i > 0 && (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: connectorDone
                      ? colors.state.success
                      : colors.ink.divider,
                    borderRadius: 1,
                  }}
                />
              )}
              {/* Dot */}
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor:
                    done || active ? dotColor : colors.ink.softBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <step.Icon
                  color={done || active ? '#FFF' : colors.ink.tertiary}
                  size={14}
                  strokeWidth={2}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Labels row — aligned under each dot */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <Text
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 10,
                color: done || active ? colors.ink.primary : colors.ink.tertiary,
                fontWeight: active ? '700' : '400',
              }}
            >
              {step.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Single active order card — Pressable with chevron indicator.
 */
function ActiveOrderCard({
  order,
  t,
  isRTL,
}: {
  order: ActiveOrder;
  t: (key: string, opts?: Record<string, unknown>) => string;
  isRTL: boolean;
}) {
  const config = STATUS_CONFIG[order.status];
  const dtConfig = DELIVERY_TYPE_CONFIG[order.deliveryType];
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Pressable
      onPress={() => {}  /* TODO: navigate to order detail */}
      className={`mx-4 mb-3 overflow-hidden ${surfaces.card} p-4`}
      style={shadows.card}
    >
      {/* Top row: merchant + chevron */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
          <View
            className="items-center justify-center rounded-xl"
            style={{
              width: 40,
              height: 40,
              backgroundColor: order.merchantColor,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
              {order.merchantInitial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-base font-bold text-gray-900">
              {order.merchantName}
            </Text>
            <View
              className="mt-0.5 flex-row items-center flex-wrap"
              style={{ gap: 4 }}
            >
              <Text className="text-xs" style={{ color: colors.ink.tertiary }}>
                #{order.orderNumber}
              </Text>
              <Text className="text-xs text-gray-400">·</Text>
              <Text className="text-xs text-gray-500">
                {t('orders.items_count', { count: order.itemCount })}
              </Text>
              <Text className="text-xs text-gray-400">·</Text>
              <Price
                amount={order.totalPrice}
                size={12}
                color={colors.ink.secondary}
              />
            </View>
          </View>
        </View>

        {/* Chevron arrow */}
        <Chevron color={colors.ink.tertiary} size={18} strokeWidth={1.5} />
      </View>

      {/* Badges row: delivery type + status + estimated time */}
      <View className="mt-3 flex-row items-center flex-wrap" style={{ gap: 6 }}>
        {/* Delivery type badge */}
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: dtConfig.bg, gap: 4 }}
        >
          {order.deliveryType === 'delivery' && (
            <Truck color={dtConfig.color} size={11} strokeWidth={2} />
          )}
          {order.deliveryType === 'pickup' && (
            <MapPin color={dtConfig.color} size={11} strokeWidth={2} />
          )}
          {order.deliveryType === 'curbside' && (
            <Car color={dtConfig.color} size={11} strokeWidth={2} />
          )}
          <Text style={{ color: dtConfig.color, fontSize: 11, fontWeight: '600' }}>
            {t(`orders.delivery_type_${order.deliveryType}`)}
          </Text>
        </View>

        {/* Status badge */}
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: config.bg, gap: 4 }}
        >
          <View
            className="rounded-full"
            style={{ width: 6, height: 6, backgroundColor: config.color }}
          />
          <Text style={{ color: config.color, fontSize: 11, fontWeight: '700' }}>
            {t(`orders.status_${order.status}`)}
          </Text>
        </View>

        {/* Estimated time */}
        <View className="flex-row items-center" style={{ gap: 3 }}>
          <Clock color={colors.ink.tertiary} size={12} strokeWidth={1.5} />
          <Text style={{ color: colors.ink.tertiary, fontSize: 11 }}>
            ~{order.estimatedMinutes} {t('orders.minute')}
          </Text>
        </View>
      </View>

      {/* Branch name for pickup/curbside */}
      {order.branchName &&
        (order.deliveryType === 'pickup' ||
          order.deliveryType === 'curbside') && (
          <View
            className="mt-2 flex-row items-center rounded-lg px-3 py-2"
            style={{ backgroundColor: '#F9FAFB', gap: 6 }}
          >
            <MapPin color={colors.ink.secondary} size={13} strokeWidth={1.5} />
            <Text style={{ color: colors.ink.secondary, fontSize: 12 }}>
              {order.branchName}
            </Text>
          </View>
        )}

      {/* Car info for curbside */}
      {order.deliveryType === 'curbside' && order.carInfo && (
        <View
          className="mt-2 flex-row items-center rounded-lg px-3 py-2"
          style={{ backgroundColor: '#F0F9FF', gap: 6 }}
        >
          <Car color="#1E40AF" size={13} strokeWidth={1.5} />
          <Text style={{ color: '#1E40AF', fontSize: 12 }}>
            {order.carInfo.brand} · {order.carInfo.color} · {order.carInfo.plate}
          </Text>
        </View>
      )}

      {/* Steps progress */}
      <OrderSteps
        currentStep={config.step}
        deliveryType={order.deliveryType}
        t={t}
      />

      {/* Action buttons */}
      <View className="mt-3 flex-row" style={{ gap: 8 }}>
        {/* Primary button — depends on delivery type */}
        <Pressable
          className="flex-1 flex-row items-center justify-center rounded-xl py-3"
          style={{ backgroundColor: colors.brand.DEFAULT, gap: 6 }}
        >
          {order.deliveryType === 'pickup' || order.deliveryType === 'curbside' ? (
            <>
              <Navigation color="#FFF" size={15} strokeWidth={2} />
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
                {t('orders.directions_to_branch')}
              </Text>
            </>
          ) : (
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
              {t('orders.track_order')}
            </Text>
          )}
        </Pressable>

        {/* Cancel button — only for preparing */}
        {order.status === 'preparing' && (
          <Pressable
            className="items-center justify-center rounded-xl border px-4 py-3"
            style={{ borderColor: colors.state.danger }}
          >
            <Text
              style={{
                color: colors.state.danger,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {t('orders.cancel_order')}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Single past order card — Pressable with chevron indicator.
 */
function PastOrderCard({
  order,
  t,
  locale,
  isRTL,
}: {
  order: PastOrder;
  t: (key: string, opts?: Record<string, unknown>) => string;
  locale: string;
  isRTL: boolean;
}) {
  const isDelivered = order.status === 'delivered';
  const dtConfig = DELIVERY_TYPE_CONFIG[order.deliveryType];
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Pressable
      onPress={() => {}  /* TODO: navigate to order detail */}
      className={`mx-4 mb-3 overflow-hidden ${surfaces.card} p-4`}
      style={shadows.card}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
          <View
            className="items-center justify-center rounded-xl"
            style={{
              width: 40,
              height: 40,
              backgroundColor: order.merchantColor,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
              {order.merchantInitial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-base font-bold text-gray-900">
              {order.merchantName}
            </Text>
            <View
              className="mt-0.5 flex-row items-center"
              style={{ gap: 4 }}
            >
              <Text className="text-xs" style={{ color: colors.ink.tertiary }}>
                #{order.orderNumber}
              </Text>
              <Text className="text-xs text-gray-400">·</Text>
              <Text className="text-xs text-gray-500">
                {formatDate(order.date, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron + badges */}
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {/* Delivery type badge */}
          <View
            className="flex-row items-center rounded-full px-2 py-0.5"
            style={{ backgroundColor: dtConfig.bg, gap: 3 }}
          >
            <Text
              style={{ color: dtConfig.color, fontSize: 10, fontWeight: '600' }}
            >
              {t(`orders.delivery_type_${order.deliveryType}`)}
            </Text>
          </View>

          {/* Status badge */}
          <View
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{
              backgroundColor: isDelivered
                ? colors.state.successTint
                : colors.state.dangerTint,
              gap: 4,
            }}
          >
            {isDelivered ? (
              <CircleCheck
                color={colors.state.success}
                size={12}
                strokeWidth={2}
              />
            ) : (
              <CircleX
                color={colors.state.danger}
                size={12}
                strokeWidth={2}
              />
            )}
            <Text
              style={{
                color: isDelivered ? colors.state.success : colors.state.danger,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {t(`orders.status_${order.status}`)}
            </Text>
          </View>
          <Chevron color={colors.ink.tertiary} size={18} strokeWidth={1.5} />
        </View>
      </View>

      {/* Price + items row */}
      <View
        className="mt-3 flex-row items-center justify-between rounded-xl px-3 py-2"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <Text className="text-xs text-gray-500">
          {t('orders.items_count', { count: order.itemCount })}
        </Text>
        <Price amount={order.totalPrice} size={14} bold />
      </View>

      {/* Reorder button */}
      {isDelivered && (
        <Pressable
          className="mt-3 flex-row items-center justify-center rounded-xl border py-3"
          style={{ borderColor: colors.brand.DEFAULT, gap: 6 }}
        >
          <RotateCcw color={colors.brand.DEFAULT} size={16} strokeWidth={2} />
          <Text
            style={{
              color: colors.brand.DEFAULT,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            {t('orders.reorder')}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

/**
 * Empty state with fade-in animation and larger icon.
 */
function EmptyState({ t }: { t: (key: string) => string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        opacity: fadeAnim,
      }}
    >
      <View
        style={{
          marginBottom: 16,
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShoppingBag color={colors.ink.tertiary} size={44} strokeWidth={0.9} />
      </View>
      <Text className="text-center text-lg font-semibold text-gray-900">
        {t('orders.empty_title')}
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        {t('orders.empty_subtitle')}
      </Text>
      <Pressable
        onPress={() => router.push('/(tabs)/stores' as any)}
        className="mt-6 items-center justify-center rounded-xl px-8 py-3"
        style={{ backgroundColor: colors.brand.DEFAULT }}
      >
        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
          {t('orders.order_now')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */

type Tab = 'active' | 'past';

export default function OrdersScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = useIsRTL();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const hasActive = ACTIVE_ORDERS.length > 0;
  const hasPast = PAST_ORDERS.length > 0;
  const hasAny = hasActive || hasPast;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScreenContainer>
        <HeaderBar title={t('orders.title')} onBack={() => router.back()} />

        {!hasAny ? (
          <EmptyState t={t} />
        ) : (
          <>
            {/* Tabs */}
            <View className="mx-4 mb-4">
              <PillTabs
                tabs={[
                  { key: 'active', label: t('orders.tab_active') },
                  { key: 'past', label: t('orders.tab_past') },
                ]}
                active={activeTab}
                onChange={(key) => setActiveTab(key as Tab)}
              />
            </View>

            {/* Content */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {activeTab === 'active' ? (
                hasActive ? (
                  ACTIVE_ORDERS.map((order) => (
                    <ActiveOrderCard
                      key={order.id}
                      order={order}
                      t={t}
                      isRTL={isRTL}
                    />
                  ))
                ) : (
                  <View className="items-center px-6 pt-20">
                    <Package
                      color={colors.ink.tertiary}
                      size={40}
                      strokeWidth={0.8}
                    />
                    <Text className="mt-4 text-center text-sm text-gray-500">
                      {t('orders.no_active')}
                    </Text>
                  </View>
                )
              ) : hasPast ? (
                PAST_ORDERS.map((order) => (
                  <PastOrderCard
                    key={order.id}
                    order={order}
                    t={t}
                    locale={i18n.language}
                    isRTL={isRTL}
                  />
                ))
              ) : (
                <View className="items-center px-6 pt-20">
                  <Clock
                    color={colors.ink.tertiary}
                    size={40}
                    strokeWidth={0.8}
                  />
                  <Text className="mt-4 text-center text-sm text-gray-500">
                    {t('orders.no_past')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
