import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, MapPin, Plus, Pencil, Trash2, X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { surfaces } from '../../lib/surfaces';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { PrimaryButton } from '../../components/PrimaryButton';
import { DeleteButton } from '../../components/DeleteButton';
import { IconButton } from '../../components/ui/IconButton';
import { FormInput } from '../../components/ui/FormInput';
import { useMerchantDrawer } from '../components/MerchantSideDrawer';
import { LTRSwitch } from '../../components/ui/LTRSwitch';
import { merchantApi } from '../lib/merchant-auth';

interface Location {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number;
  message: string | null;
  is_active: boolean;
}

const EMPTY_LOCATION: Omit<Location, 'id'> = {
  name: '',
  address: null,
  lat: null,
  lng: null,
  geofence_radius_m: 100,
  message: null,
  is_active: true,
};

export function MerchantLocationsScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const queryClient = useQueryClient();
  const { menuButton, drawer } = useMerchantDrawer('locations');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(EMPTY_LOCATION);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['merchant', 'locations'],
    queryFn: async () => {
      const res = await merchantApi.listLocations();
      return res.data as Location[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return merchantApi.updateLocation(editing.id, form);
      }
      return merchantApi.createLocation(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'locations'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => merchantApi.deleteLocation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant', 'locations'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_LOCATION });
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      geofence_radius_m: loc.geofence_radius_m,
      message: loc.message,
      is_active: loc.is_active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  /* handleDelete removed — now uses DeleteButton with ConfirmSheet */

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer>
        <HeaderBar title={t('merchant.locations_page_title')} onBack={() => router.back()} endAction={menuButton} />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* Page title */}
            <View style={{ gap: 4 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <MapPin color={colors.ink.primary} size={24} strokeWidth={1.5} />
                <Text style={localeDirStyle} className="text-start text-xl font-bold text-gray-900">
                  {t('merchant.locations_page_title')}
                </Text>
              </View>
              <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
                {t('merchant.locations_page_subtitle')}
              </Text>
            </View>

            {/* Add button */}
            <PrimaryButton
              label={t('merchant.add_location')}
              onPress={openAdd}
              icon={<Plus color="#FFFFFF" size={18} strokeWidth={2} />}
            />

            {/* List */}
            {locations && locations.length > 0 ? (
              locations.map((loc) => (
                <View key={loc.id} className={`${surfaces.card} p-4`} style={{ gap: 8 }}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1" style={{ gap: 4 }}>
                      <Text style={localeDirStyle} className="text-start text-sm font-bold text-gray-900">{loc.name}</Text>
                      {loc.address ? (
                        <Text style={localeDirStyle} className="text-start text-xs text-gray-400" numberOfLines={2}>{loc.address}</Text>
                      ) : null}
                    </View>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: loc.is_active ? colors.state.successTint : colors.ink.softBorder }}
                    >
                      <Text className="text-3xs font-bold" style={{ color: loc.is_active ? colors.state.success : colors.ink.tertiary }}>
                        {loc.is_active ? t('merchant.location_active') : t('merchant.location_disabled')}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                    {loc.geofence_radius_m > 0 && (
                      <View className="rounded-full bg-gray-50 px-2 py-0.5">
                        <Text className="text-3xs text-gray-500">{t('merchant.geofence_range')} {loc.geofence_radius_m}{t('merchant.meter')}</Text>
                      </View>
                    )}
                    {loc.lat && loc.lng && (
                      <View className="rounded-full bg-gray-50 px-2 py-0.5">
                        <Text className="text-3xs text-gray-400" style={{ fontFamily: 'monospace' }}>
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {loc.message ? (
                    <Text style={localeDirStyle} className="text-start text-xs text-gray-500">💬 {loc.message}</Text>
                  ) : null}

                  <View className="flex-row justify-end" style={{ gap: 10 }}>
                    <IconButton icon={Pencil} onPress={() => openEdit(loc)} />
                    <DeleteButton
                      title={t('merchant.delete_location_title')}
                      message={t('merchant.delete_location_message', { name: loc.name })}
                      onConfirm={() => deleteMutation.mutate(loc.id)}
                      loading={deleteMutation.isPending}
                    />
                  </View>
                </View>
              ))
            ) : (
              <View className="items-center py-12" style={{ gap: 8 }}>
                <MapPin color={colors.ink.tertiary} size={40} strokeWidth={1} />
                <Text style={localeDirStyle} className="text-center text-sm text-gray-400">
                  {t('merchant.locations_empty')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4" style={{ gap: 16, maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between">
              <Text style={localeDirStyle} className="text-start text-base font-bold text-gray-900">
                {editing ? t('merchant.edit_location') : t('merchant.add_location')}
              </Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <X color={colors.ink.tertiary} size={20} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 12 }}>
              <View style={{ gap: 12 }}>
                {/* Name */}
                <FieldInput
                  label={`${t('merchant.location_name')} *`}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />
                {/* Address */}
                <FieldInput
                  label={t('merchant.location_address')}
                  value={form.address ?? ''}
                  onChangeText={(v) => setForm((p) => ({ ...p, address: v || null }))}
                  multiline
                />
                {/* Lat + Lng */}
                <View className="flex-row" style={{ gap: 10 }}>
                  <FieldInput
                    label={t('merchant.lat')}
                    value={form.lat?.toString() ?? ''}
                    placeholder="24.7136"
                    onChangeText={(v) => setForm((p) => ({ ...p, lat: v ? parseFloat(v) || null : null }))}
                    keyboardType="decimal-pad"
                    ltr
                  />
                  <FieldInput
                    label={t('merchant.lng')}
                    value={form.lng?.toString() ?? ''}
                    placeholder="46.6753"
                    onChangeText={(v) => setForm((p) => ({ ...p, lng: v ? parseFloat(v) || null : null }))}
                    keyboardType="decimal-pad"
                    ltr
                  />
                </View>
                {/* Geofence radius */}
                <FieldInput
                  label={t('merchant.geofence_radius')}
                  value={form.geofence_radius_m.toString()}
                  onChangeText={(v) => setForm((p) => ({ ...p, geofence_radius_m: parseInt(v, 10) || 100 }))}
                  keyboardType="number-pad"
                />
                {/* Message */}
                <FieldInput
                  label={t('merchant.location_message')}
                  value={form.message ?? ''}
                  placeholder={t('merchant.location_message_placeholder')}
                  onChangeText={(v) => setForm((p) => ({ ...p, message: v || null }))}
                  maxLength={160}
                />
                {/* Active toggle */}
                <View className="flex-row items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <Text style={localeDirStyle} className="text-start text-sm text-gray-900">
                    {t('merchant.location_is_active')}
                  </Text>
                  <LTRSwitch
                    value={form.is_active}
                    onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Save button */}
            <PrimaryButton
              label={editing ? t('merchant.save') : t('merchant.add_location')}
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!form.name.trim()}
            />
          </View>
        </View>
      </Modal>
      {drawer}
    </SafeAreaView>
  );
}

/** @deprecated Use FormInput from components/ui/FormInput instead */
const FieldInput = FormInput;
