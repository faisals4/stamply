import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Save, ArrowLeft,
  Stamp as StampIcon, Star, CreditCard, DollarSign, Percent,
  Ticket, Gift, Key, QrCode, Trash2, Plus, Globe, EyeOff,
  Lock, Coffee, UtensilsCrossed, Cake as CakeIcon, ShoppingBag,
  Scissors, Dog, Sparkles, Heart, Dumbbell, Gem, Flower2, Music,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CircleButton } from '../../components/ui/CircleButton';
import { CheckboxPin } from '../../components/ui/CheckboxPin';
import { DeleteButton } from '../../components/DeleteButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/ui/FormInput';
import { LTRSwitch } from '../../components/ui/LTRSwitch';
import { CategoryChips } from '../../components/stores/CategoryChips';
import { merchantApi } from '../lib/merchant-auth';
import {
  type CardTemplate, type CardType, type NotificationTriggerKey,
  fromApi, toApiPayload, createEmptyCard,
  DEFAULT_DESIGN, DEFAULT_SETTINGS, DEFAULT_NOTIFICATIONS,
  COLOR_PRESETS, NOTIFICATION_TRIGGER_KEYS, BUILTIN_FIELDS,
} from '../lib/card-types';

const TABS = ['tab_type', 'tab_settings', 'tab_design', 'tab_info', 'tab_notifications'] as const;

const STAMP_ICONS = [
  'Coffee', 'UtensilsCrossed', 'CakeIcon', 'ShoppingBag',
  'Scissors', 'Dog', 'Sparkles', 'Heart',
  'Dumbbell', 'Gem', 'Flower2', 'Music', 'Star', 'Gift',
] as const;

const ICON_MAP: Record<string, any> = {
  Coffee, UtensilsCrossed, CakeIcon, ShoppingBag,
  Scissors, Dog, Sparkles, Heart,
  Dumbbell, Gem, Flower2, Music, Star, Gift,
};

const CARD_TYPES: { type: CardType; icon: any; available: boolean }[] = [
  { type: 'stamp', icon: StampIcon, available: true },
  { type: 'points', icon: Star, available: false },
  { type: 'membership', icon: CreditCard, available: false },
  { type: 'cashback', icon: DollarSign, available: false },
  { type: 'discount', icon: Percent, available: false },
  { type: 'coupon', icon: Ticket, available: false },
  { type: 'gift', icon: Gift, available: false },
  { type: 'multipass', icon: Key, available: false },
];

export function MerchantCardEditorScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const [activeTab, setActiveTab] = useState(0);
  const [card, setCard] = useState<CardTemplate>(createEmptyCard());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing card
  const { data: fetchedCard, isLoading } = useQuery({
    queryKey: ['merchant', 'card', id],
    queryFn: async () => {
      const res = await merchantApi.getCard(id!);
      return fromApi(res.data);
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (fetchedCard) setCard(fetchedCard);
  }, [fetchedCard]);

  const handleSave = async (andExit = false) => {
    setIsSaving(true);
    try {
      const payload = toApiPayload(card);
      if (isNew) {
        const res = await merchantApi.createCard(payload);
        const saved = fromApi(res.data);
        setCard(saved);
        queryClient.invalidateQueries({ queryKey: ['merchant', 'cards'] });
        if (andExit) router.back();
        else router.setParams({ id: saved.id });
      } else {
        const res = await merchantApi.updateCard(id!, payload);
        setCard(fromApi(res.data));
        queryClient.invalidateQueries({ queryKey: ['merchant', 'cards'] });
        if (andExit) router.back();
      }
    } catch (e: any) {
      Alert.alert(t('errors.unknown'), e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    const newStatus = card.status === 'active' ? 'draft' : 'active';
    update({ status: newStatus });
    if (!isNew) {
      try {
        await merchantApi.updateCard(id!, toApiPayload({ ...card, status: newStatus }));
        queryClient.invalidateQueries({ queryKey: ['merchant', 'cards'] });
      } catch (e: any) {
        Alert.alert(t('errors.unknown'), e.message);
      }
    }
  };

  const update = (patch: Partial<CardTemplate>) => setCard((prev) => ({ ...prev, ...patch }));
  const updateDesign = (patch: Partial<CardTemplate['design']>) =>
    setCard((prev) => ({ ...prev, design: { ...prev.design, ...patch } }));
  const updateSettings = (patch: Partial<CardTemplate['settings']>) =>
    setCard((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  if (isLoading && !isNew) {
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
        {/* Header: card name + status */}
        <View className="border-b border-gray-100 bg-white px-4 pb-2 pt-3" style={{ gap: 6 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <CircleButton
              onPress={() => router.back()}
              icon={isRTL ? <ChevronRight color={colors.navIcon} size={20} strokeWidth={2} /> : <ChevronLeft color={colors.navIcon} size={20} strokeWidth={2} />}
            />
            <Text className="flex-1 text-center text-sm font-bold text-gray-900" numberOfLines={1}>
              {card.name || t('merchant.new_card')}
            </Text>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: card.status === 'active' ? '#DBEAFE' : '#F3F4F6' }}
            >
              <Text
                className="text-3xs font-bold"
                style={{ color: card.status === 'active' ? '#1E40AF' : colors.ink.secondary }}
              >
                {card.status === 'active' ? t('merchant.status_active') : t('merchant.status_draft')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="mt-2" style={{ flexGrow: 0 }}>
          <CategoryChips
            categories={
              (isNew ? TABS.filter((k) => k !== 'tab_notifications') : TABS).map((k) => t(`merchant.${k}`))
            }
            active={t(`merchant.${TABS[activeTab]}`)}
            onSelect={(label) => {
              const idx = TABS.findIndex((k) => t(`merchant.${k}`) === label);
              if (idx >= 0) setActiveTab(idx);
            }}
          />
        </View>

        {/* Tab content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 0 && <TypeTab card={card} update={update} />}
          {activeTab === 1 && <SettingsTab card={card} updateSettings={updateSettings} />}
          {activeTab === 2 && <DesignTab card={card} updateDesign={updateDesign} />}
          {activeTab === 3 && <InfoTab card={card} update={update} />}
          {activeTab === 4 && !isNew && <NotificationsTab card={card} update={update} />}
        </ScrollView>

        {/* Bottom action bar */}
        <View className="flex-row border-t border-gray-100 bg-white px-4 py-3" style={{ gap: 8 }}>
          {!isNew && (
            <PrimaryButton
              label={card.status === 'active' ? t('merchant.unpublish') : t('merchant.publish')}
              variant={card.status === 'active' ? 'ghost' : 'primary'}
              icon={card.status === 'active'
                ? <EyeOff color={colors.brand.DEFAULT} size={16} strokeWidth={2} />
                : <Globe color={colors.white} size={16} strokeWidth={2} />
              }
              onPress={handlePublishToggle}
            />
          )}
          <PrimaryButton
            label={t('merchant.save')}
            variant="ghost"
            icon={<Save color={colors.brand.DEFAULT} size={16} strokeWidth={2} />}
            onPress={() => handleSave(false)}
            loading={isSaving}
          />
          <View className="flex-1">
            <PrimaryButton
              label={t('merchant.save_and_exit')}
              onPress={() => handleSave(true)}
              loading={isSaving}
            />
          </View>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 1 — نوع البطاقة
   ═══════════════════════════════════════════════════════════════ */

function TypeTab({ card, update }: { card: CardTemplate; update: (p: Partial<CardTemplate>) => void }) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={localeDirStyle} className="text-start text-base font-bold text-gray-900">
          {t('merchant.card_type_title')}
        </Text>
        <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
          {t('merchant.card_type_subtitle')}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {CARD_TYPES.map((ct) => {
          const Icon = ct.icon;
          const selected = card.type === ct.type;
          return (
            <Pressable
              key={ct.type}
              onPress={() => ct.available && update({ type: ct.type })}
              className="flex-row items-center rounded-2xl border p-4"
              style={{
                gap: 12,
                borderColor: selected ? colors.brand.DEFAULT : '#E5E7EB',
                backgroundColor: selected ? '#FEF0EB' : '#FFFFFF',
                opacity: ct.available ? 1 : 0.5,
              }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 40, height: 40, backgroundColor: selected ? colors.brand.DEFAULT : '#F3F4F6' }}
              >
                <Icon color={selected ? '#FFFFFF' : colors.ink.secondary} size={20} strokeWidth={1.5} />
              </View>
              <View className="flex-1" style={{ gap: 2 }}>
                <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
                  {t(`merchant.card_type_${ct.type}`)}
                </Text>
                <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
                  {t(`merchant.card_type_${ct.type}_desc`)}
                </Text>
              </View>
              {!ct.available && (
                <View className="rounded-full bg-gray-100 px-2 py-0.5">
                  <Text className="text-3xs text-gray-400">{t('merchant.coming_soon')}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 2 — إعدادات
   ═══════════════════════════════════════════════════════════════ */

const CUSTOM_FIELD_TYPES = [
  { value: 'text', labelKey: 'merchant.field_type_text' },
  { value: 'email', labelKey: 'merchant.field_type_email' },
  { value: 'phone', labelKey: 'merchant.field_type_phone_extra' },
  { value: 'date', labelKey: 'merchant.field_type_date' },
] as const;

function SettingsTab({
  card,
  updateSettings,
}: {
  card: CardTemplate;
  updateSettings: (p: Partial<CardTemplate['settings']>) => void;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const s = card.settings;
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<string>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    const key = `custom_${Date.now()}`;
    const fields = [...s.registrationFields, {
      key,
      label: newFieldName.trim(),
      type: newFieldType as any,
      required: newFieldRequired,
    }];
    updateSettings({ registrationFields: fields });
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setShowAddField(false);
  };

  const toggleField = (key: string) => {
    const fields = [...s.registrationFields];
    const idx = fields.findIndex((f) => f.key === key);
    if (idx >= 0) {
      if (fields[idx].locked) return;
      fields.splice(idx, 1);
    } else {
      const suggested = SUGGESTED_FIELDS.find((f) => f.key === key);
      if (suggested) fields.push({ ...suggested });
    }
    updateSettings({ registrationFields: fields });
  };

  return (
    <View style={{ gap: 24 }}>
      {/* Barcode type */}
      <Section title={t('merchant.barcode_type')}>
        <View className="flex-row" style={{ gap: 10 }}>
          {(['qrcode', 'pdf417'] as const).map((bt) => (
            <Pressable
              key={bt}
              onPress={() => updateSettings({ barcodeType: bt })}
              className="flex-1 flex-row items-center justify-center rounded-xl border py-3"
              style={{
                gap: 6,
                borderColor: s.barcodeType === bt ? colors.brand.DEFAULT : '#E5E7EB',
                backgroundColor: s.barcodeType === bt ? '#FEF0EB' : '#FFFFFF',
              }}
            >
              <View
                className="rounded-full"
                style={{
                  width: 16, height: 16, borderWidth: 2,
                  borderColor: s.barcodeType === bt ? colors.brand.DEFAULT : '#D1D5DB',
                  backgroundColor: s.barcodeType === bt ? colors.brand.DEFAULT : 'transparent',
                }}
              />
              <Text className="text-xs" style={{ color: s.barcodeType === bt ? colors.brand.DEFAULT : colors.ink.primary }}>
                {bt === 'qrcode' ? 'QR Code' : 'PDF 417'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Expiry */}
      <Section title={t('merchant.expiry_title')}>
        <View className="flex-row" style={{ gap: 10 }}>
          <LabeledInput
            label={t('merchant.card_lifetime')}
            value={s.expirationDays?.toString() ?? ''}
            placeholder={t('merchant.unlimited')}
            onChangeText={(v) => updateSettings({ expirationDays: v ? parseInt(v, 10) || null : null })}
            keyboardType="number-pad"
          />
          <LabeledInput
            label={t('merchant.stamp_lifetime')}
            value={s.stampLifetimeDays?.toString() ?? ''}
            placeholder={t('merchant.unlimited')}
            onChangeText={(v) => updateSettings({ stampLifetimeDays: v ? parseInt(v, 10) || null : null })}
            keyboardType="number-pad"
          />
        </View>
      </Section>

      {/* Reward stamps */}
      <Section title={t('merchant.reward_stamps_title')}>
        <View className="flex-row" style={{ gap: 10 }}>
          <LabeledInput
            label={t('merchant.welcome_stamps')}
            value={s.welcomeStamps.toString()}
            onChangeText={(v) => updateSettings({ welcomeStamps: parseInt(v, 10) || 0 })}
            keyboardType="number-pad"
          />
          <LabeledInput
            label={t('merchant.birthday_stamps')}
            value={s.birthdayStamps.toString()}
            onChangeText={(v) => updateSettings({ birthdayStamps: parseInt(v, 10) || 0 })}
            keyboardType="number-pad"
          />
        </View>
      </Section>

      {/* Limits */}
      <Section title={t('merchant.limits_title')}>
        <View className="flex-row" style={{ gap: 10 }}>
          <LabeledInput
            label={t('merchant.daily_stamp_limit')}
            value={s.maxStampsPerDay?.toString() ?? ''}
            placeholder={t('merchant.no_limit')}
            onChangeText={(v) => updateSettings({ maxStampsPerDay: v ? parseInt(v, 10) || null : null })}
            keyboardType="number-pad"
          />
          <LabeledInput
            label={t('merchant.issued_cards_limit')}
            value={s.maxIssuedCards?.toString() ?? ''}
            placeholder={t('merchant.no_limit')}
            onChangeText={(v) => updateSettings({ maxIssuedCards: v ? parseInt(v, 10) || null : null })}
            keyboardType="number-pad"
          />
        </View>
      </Section>

      {/* Registration fields */}
      <Section title={t('merchant.registration_fields')}>
        <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
          {t('merchant.registration_fields_subtitle')}
        </Text>
        <View style={{ gap: 8 }}>
          {s.registrationFields.map((field, idx) => (
            <View key={field.key} className={`${surfaces.card} px-4 py-3`} style={{ gap: 10 }}>
              {/* Row 1: arrows/lock + name (editable if unlocked) + type badge */}
              <View className="flex-row items-center" style={{ gap: 8 }}>
                {field.locked && <Lock color={colors.ink.tertiary} size={14} strokeWidth={2} />}
                {!field.locked && (
                  <View style={{ gap: 2 }}>
                    <Pressable onPress={() => { if(idx<=2)return; const f=[...s.registrationFields]; [f[idx-1],f[idx]]=[f[idx],f[idx-1]]; updateSettings({registrationFields:f}); }} disabled={idx<=2} hitSlop={4} style={{opacity:idx<=2?0.2:1}}>
                      <Text className="text-3xs text-gray-400">▲</Text>
                    </Pressable>
                    <Pressable onPress={() => { if(idx>=s.registrationFields.length-1)return; const f=[...s.registrationFields]; [f[idx],f[idx+1]]=[f[idx+1],f[idx]]; updateSettings({registrationFields:f}); }} disabled={idx>=s.registrationFields.length-1} hitSlop={4} style={{opacity:idx>=s.registrationFields.length-1?0.2:1}}>
                      <Text className="text-3xs text-gray-400">▼</Text>
                    </Pressable>
                  </View>
                )}
                {field.locked ? (
                  <Text style={localeDirStyle} className="flex-1 text-start text-sm font-bold text-gray-900">{field.label}</Text>
                ) : (
                  <TextInput
                    style={[localeDirStyle, {
                      flex: 1, maxWidth: '60%', fontSize: 14, fontWeight: '600', color: colors.ink.primary,
                      borderWidth: 1, borderColor: colors.ink.border, borderRadius: 10,
                      height: 38, paddingHorizontal: 10, outlineWidth: 0,
                    } as any]}
                    value={field.label}
                    placeholder={t('merchant.field_name_placeholder')}
                    placeholderTextColor={colors.ink.tertiary}
                    onChangeText={(v) => { const f=[...s.registrationFields]; f[idx]={...f[idx],label:v}; updateSettings({registrationFields:f}); }}
                  />
                )}
                <View className="rounded-full bg-gray-100 px-2 py-0.5">
                  <Text className="text-3xs text-gray-500">{t(`merchant.field_type_${field.type}`)}</Text>
                </View>
              </View>
              {/* Row 2: required (inline-start) + delete (inline-end) */}
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Pressable
                  onPress={field.locked ? undefined : () => { const f=[...s.registrationFields]; f[idx]={...f[idx],required:!f[idx].required}; updateSettings({registrationFields:f}); }}
                  disabled={field.locked}
                  className="flex-row items-center" style={{ gap: 4 }}
                >
                  <CheckboxPin selected={field.required} size={18} />
                  <Text className="text-3xs text-gray-500">{t('merchant.field_required')}</Text>
                </Pressable>
                <View className="flex-1" />
                {!field.locked && (
                  <DeleteButton
                    title={t('merchant.delete_field_title')}
                    message={t('merchant.delete_field_message', { name: field.label })}
                    onConfirm={() => toggleField(field.key)}
                    size={14}
                  />
                )}
              </View>
            </View>
          ))}
          {/* Suggested optional fields */}
          <Text style={localeDirStyle} className="mt-2 text-start text-3xs text-gray-400">
            {t('merchant.suggested_fields')}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {SUGGESTED_FIELDS.map((sf) => {
              const added = s.registrationFields.some((f) => f.key === sf.key);
              return (
                <Pressable
                  key={sf.key}
                  onPress={() => toggleField(sf.key)}
                  className="flex-row items-center rounded-full border px-3 py-1.5"
                  style={{
                    gap: 4,
                    borderColor: added ? colors.brand.DEFAULT : colors.ink.border,
                    backgroundColor: added ? colors.brand[50] : colors.white,
                  }}
                >
                  <Text className="text-xs" style={{ color: added ? colors.brand.DEFAULT : colors.ink.secondary }}>
                    + {sf.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Add custom field */}
          {showAddField ? (
            <View className={`${surfaces.card} p-4`} style={{ gap: 12 }}>
              <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
                {t('merchant.new_field')}
              </Text>
              {/* Name input */}
              <View style={{ gap: 4 }}>
                <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">{t('merchant.field_label_name')}</Text>
                <TextInput
                  style={[localeDirStyle, {
                    borderWidth: 1, borderColor: colors.ink.border, borderRadius: 10,
                    height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.ink.primary,
                    outlineWidth: 0,
                  } as any]}
                  value={newFieldName}
                  placeholder={t('merchant.field_name_placeholder_example')}
                  placeholderTextColor={colors.ink.tertiary}
                  onChangeText={setNewFieldName}
                />
              </View>
              {/* Type selector — inline pills */}
              <View style={{ gap: 4 }}>
                <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">{t('merchant.field_label_type')}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {CUSTOM_FIELD_TYPES.map((ft) => {
                    const active = newFieldType === ft.value;
                    return (
                      <Pressable
                        key={ft.value}
                        onPress={() => setNewFieldType(ft.value)}
                        className="rounded-full border px-3 py-1.5"
                        style={{
                          borderColor: active ? colors.brand.DEFAULT : colors.ink.border,
                          backgroundColor: active ? colors.brand[50] : colors.white,
                        }}
                      >
                        <Text className="text-xs" style={{ color: active ? colors.brand.DEFAULT : colors.ink.secondary }}>
                          {t(ft.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {/* Required checkbox */}
              <Pressable
                onPress={() => setNewFieldRequired(!newFieldRequired)}
                className="flex-row items-center" style={{ gap: 6 }}
              >
                <CheckboxPin selected={newFieldRequired} size={18} />
                <Text className="text-xs text-gray-600">{t('merchant.field_required')}</Text>
              </Pressable>
              {/* Actions — end-aligned */}
              <View className="flex-row" style={{ gap: 8 }}>
                <View className="flex-1">
                  <PrimaryButton
                    label={t('merchant.add_field')}
                    onPress={addCustomField}
                    disabled={!newFieldName.trim()}
                    icon={<Plus color={colors.white} size={16} strokeWidth={2} />}
                  />
                </View>
                <View>
                  <PrimaryButton
                    label={t('settings.cancel')}
                    onPress={() => setShowAddField(false)}
                    variant="ghost"
                  />
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddField(true)}
              className="flex-row items-center justify-center rounded-xl border border-dashed border-gray-200 py-3"
              style={{ gap: 6 }}
            >
              <Plus color={colors.ink.secondary} size={16} strokeWidth={2} />
              <Text className="text-xs text-gray-500">{t('merchant.add_custom_field')}</Text>
            </Pressable>
          )}
        </View>
      </Section>
    </View>
  );
}

const SUGGESTED_FIELDS = [
  { key: 'birthdate', label: 'تاريخ الميلاد', type: 'date' as const, required: false },
  { key: 'gender', label: 'الجنس', type: 'select' as const, required: false },
  { key: 'email', label: 'البريد الإلكتروني', type: 'email' as const, required: false },
];

/* ═══════════════════════════════════════════════════════════════
   Tab 3 — تصميم
   ═══════════════════════════════════════════════════════════════ */

function DesignTab({
  card,
  updateDesign,
}: {
  card: CardTemplate;
  updateDesign: (p: Partial<CardTemplate['design']>) => void;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const d = card.design;

  return (
    <View style={{ gap: 24 }}>
      {/* Stamps count */}
      <Section title={t('merchant.stamps_count')}>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              onPress={() => updateDesign({ stampsCount: n })}
              className="items-center justify-center rounded-xl"
              style={{
                width: 40, height: 40,
                backgroundColor: d.stampsCount === n ? colors.brand.DEFAULT : '#F3F4F6',
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: d.stampsCount === n ? '#FFFFFF' : colors.ink.primary }}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Stamp icon library */}
      <Section title={t('merchant.stamp_icon')}>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {STAMP_ICONS.map((iconName) => {
            const IconComp = ICON_MAP[iconName];
            if (!IconComp) return null;
            const selected = d.activeStampIcon === iconName;
            return (
              <Pressable
                key={iconName}
                onPress={() => updateDesign({ activeStampIcon: iconName, inactiveStampIcon: iconName })}
                className="items-center justify-center rounded-xl border-2"
                style={{
                  width: 48, height: 48,
                  borderColor: selected ? colors.brand.DEFAULT : '#E5E7EB',
                  backgroundColor: selected ? '#FEF0EB' : '#FFFFFF',
                }}
              >
                <IconComp color={selected ? colors.brand.DEFAULT : colors.ink.secondary} size={22} strokeWidth={1.5} />
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Labels */}
      <Section title={t('merchant.texts_title')}>
        <View style={{ gap: 10 }}>
          <View className="flex-row" style={{ gap: 10 }}>
            <LabeledInput
              label={t('merchant.stamps_label_ar')}
              value={d.labels?.stamps ?? ''}
              placeholder="الأختام"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, stamps: v } })}
            />
            <LabeledInput
              label={t('merchant.stamps_label_en')}
              value={d.labels?.stampsEn ?? ''}
              placeholder="Stamps"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, stampsEn: v } })}
            />
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <LabeledInput
              label={t('merchant.reward_label_ar')}
              value={d.labels?.reward ?? ''}
              placeholder="المكافأة"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, reward: v } })}
            />
            <LabeledInput
              label={t('merchant.reward_label_en')}
              value={d.labels?.rewardEn ?? ''}
              placeholder="Gift"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, rewardEn: v } })}
            />
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <LabeledInput
              label={t('merchant.customer_label_ar')}
              value={d.labels?.customer ?? ''}
              placeholder="العميل"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, customer: v } })}
            />
            <LabeledInput
              label={t('merchant.customer_label_en')}
              value={d.labels?.customerEn ?? ''}
              placeholder="Customer"
              onChangeText={(v) => updateDesign({ labels: { ...d.labels, customerEn: v } })}
            />
          </View>
        </View>
      </Section>

      {/* Colors */}
      <Section title={t('merchant.colors_title')}>
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {COLOR_PRESETS.map((preset) => {
            const selected =
              d.colors.background === preset.bg && d.colors.foreground === preset.fg;
            return (
              <Pressable
                key={preset.key}
                onPress={() =>
                  updateDesign({
                    colors: {
                      background: preset.bg,
                      foreground: preset.fg,
                      stampsBackground: preset.stampsBg,
                      activeStamp: preset.active,
                      inactiveStamp: preset.inactive,
                    },
                  })
                }
                className="items-center rounded-xl border-2 p-2"
                style={{
                  width: 72,
                  borderColor: selected ? colors.brand.DEFAULT : 'transparent',
                  gap: 4,
                }}
              >
                <View
                  className="rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: preset.bg,
                    borderWidth: 2,
                    borderColor: preset.fg,
                  }}
                />
                <Text className="text-3xs text-gray-500">{preset.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 4 — معلومات
   ═══════════════════════════════════════════════════════════════ */

function InfoTab({
  card,
  update,
}: {
  card: CardTemplate;
  update: (p: Partial<CardTemplate>) => void;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const addReward = () => {
    update({
      rewards: [
        ...card.rewards,
        { id: `new-${Date.now()}`, name: '', stampsRequired: card.design.stampsCount },
      ],
    });
  };

  const updateReward = (idx: number, patch: Partial<CardTemplate['rewards'][0]>) => {
    const next = [...card.rewards];
    next[idx] = { ...next[idx], ...patch };
    update({ rewards: next });
  };

  const removeReward = (idx: number) => {
    update({ rewards: card.rewards.filter((_, i) => i !== idx) });
  };

  return (
    <View style={{ gap: 24 }}>
      {/* Card name */}
      <Section title={t('merchant.card_info_title')}>
        <View style={{ gap: 10 }}>
          <View className="flex-row" style={{ gap: 10 }}>
            <LabeledInput
              label={t('merchant.card_name_ar')}
              value={card.name}
              onChangeText={(v) => update({ name: v })}
              maxLength={24}
            />
            <LabeledInput
              label={t('merchant.card_name_en')}
              value={card.design.nameEn ?? ''}
              placeholder="Loyalty Card..."
              onChangeText={(v) =>
                update({ design: { ...card.design, nameEn: v } })
              }
              maxLength={24}
            />
          </View>
          <LabeledInput
            label={t('merchant.description')}
            value={card.description ?? ''}
            placeholder={t('merchant.description_placeholder')}
            onChangeText={(v) => update({ description: v || undefined })}
            multiline
          />
        </View>
      </Section>

      {/* Rewards */}
      <Section title={t('merchant.rewards_title')}>
        <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
          {t('merchant.rewards_subtitle')}
        </Text>
        <View style={{ gap: 10 }}>
          {card.rewards.map((reward, idx) => (
            <View key={reward.id} className={`${surfaces.card} p-3`} style={{ gap: 8 }}>
              {/* Row 1: name + delete */}
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TextInput
                  style={[localeDirStyle, {
                    flex: 1, fontSize: 14, color: colors.ink.primary, fontWeight: '600',
                    borderWidth: 1, borderColor: colors.ink.border, borderRadius: 10,
                    height: 40, paddingHorizontal: 12,
                    outlineWidth: 0,
                  } as any]}
                  value={reward.name}
                  placeholder={t('merchant.reward_name_placeholder')}
                  placeholderTextColor={colors.ink.tertiary}
                  onChangeText={(v) => updateReward(idx, { name: v })}
                />
                <DeleteButton
                  title={t('merchant.delete_reward_title')}
                  message={t('merchant.delete_reward_message', { name: reward.name || '...' })}
                  onConfirm={() => removeReward(idx)}
                  size={16}
                />
              </View>
              {/* Row 2: stamps required */}
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
                  {t('merchant.after_stamps')}
                </Text>
                <TextInput
                  style={{
                    width: 52, fontSize: 14, textAlign: 'center', color: colors.ink.primary,
                    borderWidth: 1, borderColor: colors.ink.border, borderRadius: 10,
                    height: 34, paddingHorizontal: 4, fontWeight: '600',
                  }}
                  value={reward.stampsRequired.toString()}
                  keyboardType="number-pad"
                  onChangeText={(v) => updateReward(idx, { stampsRequired: parseInt(v, 10) || 1 })}
                />
                <Text className="text-xs text-gray-400">{t('merchant.stamps_label')}</Text>
              </View>
            </View>
          ))}
          <Pressable
            onPress={addReward}
            className="flex-row items-center justify-center rounded-xl border border-dashed border-gray-200 py-3"
            style={{ gap: 6 }}
          >
            <Plus color={colors.ink.secondary} size={16} strokeWidth={2} />
            <Text className="text-xs text-gray-500">{t('merchant.add_reward')}</Text>
          </Pressable>
        </View>
      </Section>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tab 5 — التنبيهات
   ═══════════════════════════════════════════════════════════════ */

const TRIGGER_LABELS: Record<NotificationTriggerKey, string> = {
  welcome: 'trigger_welcome',
  halfway: 'trigger_halfway',
  almost_there: 'trigger_almost',
  reward_ready: 'trigger_reward_ready',
  redeemed: 'trigger_redeemed',
};

function NotificationsTab({
  card,
  update,
}: {
  card: CardTemplate;
  update: (p: Partial<CardTemplate>) => void;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const toggleTrigger = (key: NotificationTriggerKey) => {
    const n = { ...card.notifications };
    n[key] = { ...n[key], enabled: !n[key].enabled };
    update({ notifications: n });
  };

  const updateMessage = (key: NotificationTriggerKey, field: 'message_ar' | 'message_en', value: string) => {
    const n = { ...card.notifications };
    n[key] = { ...n[key], [field]: value };
    update({ notifications: n });
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={localeDirStyle} className="text-start text-base font-bold text-gray-900">
          {t('merchant.notifications_title')}
        </Text>
        <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
          {t('merchant.notifications_subtitle')}
        </Text>
      </View>

      {NOTIFICATION_TRIGGER_KEYS.map((key) => {
        const trigger = card.notifications[key];
        return (
          <View key={key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4" style={{ gap: 10 }}>
            <View className="flex-row items-center justify-between">
              <Text style={localeDirStyle} className="flex-1 text-start text-sm font-bold text-gray-900">
                {t(`merchant.${TRIGGER_LABELS[key]}`)}
              </Text>
              <LTRSwitch
                value={trigger.enabled}
                onValueChange={() => toggleTrigger(key)}
              />
            </View>
            {trigger.enabled && (
              <View style={{ gap: 8 }}>
                <LabeledInput
                  label={t('merchant.message_ar')}
                  value={trigger.message_ar}
                  onChangeText={(v) => updateMessage(key, 'message_ar', v)}
                  multiline
                />
                <LabeledInput
                  label={t('merchant.message_en')}
                  value={trigger.message_en}
                  onChangeText={(v) => updateMessage(key, 'message_en', v)}
                  multiline
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <View style={{ gap: 10 }}>
      <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** @deprecated Use FormInput from components/ui/FormInput instead */
const LabeledInput = FormInput;
