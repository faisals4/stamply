import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X, Search, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { useIsRTL } from '../../lib/rtl';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';
import {
  carBrands,
  carColors,
  arabicToEnglishDigits,
  type CarBrand,
  type CarColor,
} from './car-data';
import type { CarInfo } from './branch-data';

type Step = 'brand' | 'color' | 'plate';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (car: CarInfo) => void;
};

/**
 * Multi-step "Add new car" modal — ported from orders4's
 * `add-car-modal.tsx`. Three steps:
 *
 *   1. **Brand** — 5-col grid of brand logos with live search.
 *      Tapping a brand selects it (highlighted border).
 *   2. **Color** — 5-col grid of color swatches. The selected one
 *      shows a white ✓ overlay.
 *   3. **Plate** — single centered text input for the license plate
 *      number. Arabic-Indic digits are auto-converted to Western.
 *
 * A "Next" button advances through the steps; on the last step it
 * becomes "Save" and calls `onSave` with a `CarInfo` object that
 * matches the shape used by `CarSelectionModal` and `CarInfoBlock`.
 *
 * Reusable across checkout curbside flow and any future "manage my
 * cars" screen in profile/settings.
 */
export function AddCarModal({ visible, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();

  const [step, setStep] = useState<Step>('brand');
  const [selectedBrand, setSelectedBrand] = useState<CarBrand | null>(null);
  const [selectedColor, setSelectedColor] = useState<CarColor | null>(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when the modal opens.
  useEffect(() => {
    if (visible) {
      setStep('brand');
      setSelectedBrand(null);
      setSelectedColor(null);
      setPlateNumber('');
      setBrandSearch('');
    }
  }, [visible]);

  const filteredBrands = useMemo(
    () =>
      carBrands.filter(
        (b) =>
          b.name.includes(brandSearch) ||
          b.nameEn.toLowerCase().includes(brandSearch.toLowerCase()),
      ),
    [brandSearch],
  );

  const canProceed =
    (step === 'brand' && selectedBrand !== null) ||
    (step === 'color' && selectedColor !== null) ||
    (step === 'plate' && plateNumber.trim().length > 0);

  const handleNext = () => {
    if (step === 'brand' && selectedBrand) setStep('color');
    else if (step === 'color' && selectedColor) setStep('plate');
  };

  const handleSave = () => {
    if (!selectedBrand || !selectedColor || !plateNumber.trim()) return;
    setSaving(true);
    setTimeout(() => {
      onSave({
        id: `car-${Date.now()}`,
        brand: selectedBrand.name,
        plate: plateNumber.trim(),
        color: selectedColor.hex,
        colorName: selectedColor.name,
      });
      setSaving(false);
      onClose();
    }, 400);
  };

  const stepTitle =
    step === 'brand'
      ? t('checkout.step_brand')
      : step === 'color'
      ? t('checkout.step_color')
      : t('checkout.step_plate');

  const buttonLabel =
    step === 'plate' ? t('checkout.add_car_save') : t('checkout.step_next');

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      maxHeight="85%"
    >
      {/* ── Header ── */}
      <View
        className="mb-4 flex-row items-center justify-between"
      >
        <Pressable
          onPress={onClose}
          className="h-8 w-8 items-center justify-center rounded-full border border-gray-200"
        >
          <X color={colors.ink.primary} size={16} strokeWidth={2} />
        </Pressable>
        <Text className="flex-1 text-center text-base font-bold text-gray-900">
          {stepTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 420 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Brand grid */}
        {step === 'brand' && (
          <>
            {/* Search */}
            <View className="relative mb-4">
              <TextInput
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder={
                  isRTL ? 'ابحث عن الماركة...' : 'Search brand...'
                }
                placeholderTextColor={colors.ink.tertiary}
                style={[
                  localeDirStyle,
                  {
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.ink.border,
                    backgroundColor: colors.white,
                    paddingHorizontal: 40,
                    fontSize: 14,
                    color: colors.ink.primary,
                    minWidth: 0,
                  },
                  { outlineStyle: 'none' } as any,
                ]}
              />
              <View
                className="absolute items-center justify-center"
                style={{
                  top: 0,
                  bottom: 0,
                  [isRTL ? 'right' : 'left']: 14,
                }}
              >
                <Search
                  color={colors.ink.tertiary}
                  size={16}
                  strokeWidth={2}
                />
              </View>
            </View>

            {/* 5-col grid */}
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {filteredBrands.map((brand) => {
                const isActive = selectedBrand?.id === brand.id;
                return (
                  <Pressable
                    key={brand.id}
                    onPress={() => setSelectedBrand(brand)}
                    className="items-center"
                    style={{ width: '18%', marginBottom: 6 }}
                  >
                    <View
                      className="items-center justify-center overflow-hidden rounded-xl border-2 bg-white"
                      style={{
                        width: 48,
                        height: 48,
                        borderColor: isActive
                          ? colors.brand.DEFAULT
                          : 'transparent',
                      }}
                    >
                      <Image
                        source={{ uri: brand.logo }}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                      />
                    </View>
                    <Text
                      className="mt-1 text-center text-gray-600"
                      style={{ fontSize: 9 }}
                      numberOfLines={1}
                    >
                      {brand.nameEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Step 2: Color grid */}
        {step === 'color' && (
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {carColors.map((color) => {
              const isActive = selectedColor?.id === color.id;
              const lightColors = [
                '#FFFFFF',
                '#FACC15',
                '#4ADE80',
                '#38BDF8',
                '#F9A8D4',
                '#D1D5DB',
              ];
              const checkColor = lightColors.includes(color.hex)
                ? '#000'
                : '#FFF';
              return (
                <Pressable
                  key={color.id}
                  onPress={() => setSelectedColor(color)}
                  className="items-center"
                >
                  <View
                    className="items-center justify-center rounded-xl"
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: color.hex,
                      borderWidth: color.hex === '#FFFFFF' ? 1 : 0,
                      borderColor: colors.ink.border,
                    }}
                  >
                    {isActive ? (
                      <View
                        className="items-center justify-center rounded-lg"
                        style={{
                          position: 'absolute',
                          top: 3,
                          left: 3,
                          right: 3,
                          bottom: 3,
                          borderWidth: 2,
                          borderColor: '#FFF',
                        }}
                      >
                        <Check
                          color={checkColor}
                          size={24}
                          strokeWidth={3}
                        />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Step 3: Plate number */}
        {step === 'plate' && (
          <View className="items-center pt-4">
            <TextInput
              value={plateNumber}
              onChangeText={(v) => {
                const cleaned = arabicToEnglishDigits(v);
                if (cleaned.length <= 20) setPlateNumber(cleaned);
              }}
              maxLength={20}
              placeholder={isRTL ? 'رقم اللوحة' : 'Plate Number'}
              placeholderTextColor={colors.ink.tertiary}
              style={[
                {
                  width: '100%',
                  height: 56,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.ink.divider,
                  backgroundColor: colors.white,
                  paddingHorizontal: 16,
                  fontSize: 18,
                  color: colors.ink.primary,
                  textAlign: 'center',
                  direction: 'ltr',
                  minWidth: 0,
                },
                { outlineStyle: 'none' } as any,
              ]}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Action button ── */}
      <Pressable
        onPress={step === 'plate' ? handleSave : handleNext}
        disabled={!canProceed || saving}
        className="mt-4 items-center justify-center rounded-2xl"
        style={{
          height: 48,
          backgroundColor: colors.brand.DEFAULT,
          opacity: canProceed && !saving ? 1 : 0.4,
        }}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text className="text-sm text-white">{buttonLabel}</Text>
        )}
      </Pressable>
    </ModalShell>
  );
}
