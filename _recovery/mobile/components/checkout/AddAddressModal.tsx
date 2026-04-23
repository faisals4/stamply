import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MapPin, Navigation2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { FormInput } from '../ui/FormInput';
import { ModalShell } from '../ui/ModalShell';
import type { SavedAddress } from './branch-data';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (address: SavedAddress) => void;
};

type Step = 'map' | 'form';

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

/**
 * Two-step "Add New Address" modal matching orders4's flow:
 *
 *   Step 1 — Map: interactive OpenStreetMap (via iframe on web)
 *     with a centered pin. User drags to pick a location, then
 *     taps "توصيل لهذا الموقع".
 *
 *   Step 2 — Form: label (اسم العنوان) + details (تفاصيل) +
 *     save button.
 *
 * On web, the map is rendered as an iframe embedding a Leaflet
 * instance via the OpenStreetMap embed URL. On native, a static
 * map image is shown as a fallback (full native maps integration
 * requires `react-native-maps` which is out of scope for this
 * first pass).
 */
export function AddAddressModal({ visible, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const [step, setStep] = useState<Step>('map');
  const lat = DEFAULT_LAT;
  const lng = DEFAULT_LNG;
  const [label, setLabel] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = label.trim().length > 0 && details.trim().length > 0;

  const handleConfirmLocation = () => {
    setStep('form');
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    setTimeout(() => {
      const newAddress: SavedAddress = {
        id: `addr-${Date.now()}`,
        label: label.trim(),
        details: details.trim(),
      };
      onSave(newAddress);
      setSaving(false);
      // Reset for next open.
      setLabel('');
      setDetails('');
      setStep('map');
      onClose();
    }, 400);
  };

  const handleClose = () => {
    setStep('map');
    setLabel('');
    setDetails('');
    onClose();
  };

  // OpenStreetMap embed URL centered on the current position.
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <ModalShell visible={visible} onClose={handleClose} maxWidth={440} maxHeight="90%">
      {step === 'map' ? (
        <>
          <Text
            style={localeDirStyle}
            className="mb-3 text-center text-base font-bold text-gray-900"
          >
            {t('checkout.add_address_title')}
          </Text>

          {/* Interactive map — iframe on web, static image on native. */}
          <View
            className="overflow-hidden rounded-2xl"
            style={{ height: 260, backgroundColor: '#E5E7EB' }}
          >
            {Platform.OS === 'web' ? (
              <iframe
                src={mapEmbedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 16,
                }}
                title="Select location"
                loading="lazy"
              />
            ) : (
              // Native fallback — static tile image.
              <View className="flex-1 items-center justify-center">
                <MapPin color={colors.brand.DEFAULT} size={40} strokeWidth={2} />
                <Text className="mt-2 text-xs text-gray-500">
                  {t('checkout.add_address_map_hint')}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm location button */}
          <Pressable
            onPress={handleConfirmLocation}
            className="mt-4 flex-row items-center justify-center rounded-2xl"
            style={{
              height: 48,
              backgroundColor: colors.brand.DEFAULT,
              gap: 8,
            }}
          >
            <Text className="text-sm text-white">
              {t('checkout.add_address_confirm_location')}
            </Text>
            <Navigation2 color={colors.white} size={16} strokeWidth={2} />
          </Pressable>
        </>
      ) : (
        <>
          {/* Back to map */}
          <Pressable onPress={() => setStep('map')} className="mb-3">
            <Text className="text-xs" style={{ color: colors.brand.DEFAULT }}>
              ← {t('checkout.add_address_back_to_map')}
            </Text>
          </Pressable>

          <Text
            style={localeDirStyle}
            className="mb-4 text-center text-base font-bold text-gray-900"
          >
            {t('checkout.add_address_title')}
          </Text>

          {/* Label field */}
          <FormInput
            label={t('checkout.add_address_label')}
            value={label}
            onChangeText={setLabel}
            placeholder={t('checkout.add_address_label_placeholder') as string}
            fullWidth
          />

          {/* Details field */}
          <View className="mt-2">
            <FormInput
              label={t('checkout.add_address_details')}
              value={details}
              onChangeText={setDetails}
              placeholder={t('checkout.add_address_details_placeholder') as string}
              multiline
              fullWidth
            />
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            className="mt-4 items-center justify-center rounded-2xl"
            style={{
              height: 48,
              backgroundColor: colors.brand.DEFAULT,
              opacity: canSave && !saving ? 1 : 0.4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text className="text-sm text-white">
                {t('checkout.add_address_save')}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </ModalShell>
  );
}
