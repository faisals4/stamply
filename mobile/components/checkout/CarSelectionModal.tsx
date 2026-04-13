import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ModalShell } from '../ui/ModalShell';
import { RadioPin } from '../ui/RadioPin';
import { AddCarModal } from './AddCarModal';
import { savedCars, type CarInfo } from './branch-data';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedCarId?: string | null;
  onSelect: (car: CarInfo) => void;
};

/**
 * Car selection modal — shown when the user taps "تغيير" on the
 * CarInfoBlock in the curbside checkout flow. Scrollable list of
 * saved cars, each with a color swatch, brand name, plate number,
 * and a radio pin.
 */
export function CarSelectionModal({
  visible,
  onClose,
  selectedCarId,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [pickedId, setPickedId] = useState<string | null>(
    selectedCarId ?? savedCars[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);

  const handleSave = () => {
    const car = savedCars.find((c) => c.id === pickedId);
    if (!car) return;
    setSaving(true);
    setTimeout(() => {
      onSelect(car);
      setSaving(false);
      onClose();
    }, 400);
  };

  return (
    <ModalShell visible={visible} onClose={onClose} maxWidth={420} maxHeight="80%">
      <Text
        style={localeDirStyle}
        className="mb-4 text-center text-base font-bold text-gray-900"
      >
        {t('checkout.car_modal_title')}
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {savedCars.map((car) => {
          const isActive = car.id === pickedId;
          return (
            <Pressable
              key={car.id}
              onPress={() => setPickedId(car.id)}
              className="flex-row items-center rounded-2xl border bg-white p-3"
              style={{
                gap: 10,
                borderColor: isActive ? colors.brand.DEFAULT : colors.ink.border,
                backgroundColor: isActive ? 'rgba(235, 89, 46, 0.04)' : colors.white,
              }}
            >
              <RadioPin selected={isActive} />

              {/* Color swatch */}
              <View
                className="rounded-lg"
                style={{ width: 24, height: 24, backgroundColor: car.color }}
              />

              {/* Brand + plate + color name */}
              <View className="flex-1">
                <Text
                  style={localeDirStyle}
                  className="text-start text-sm font-medium text-gray-900"
                >
                  {car.brand}
                </Text>
                <Text
                  style={localeDirStyle}
                  className="mt-0.5 text-start text-xs text-gray-500"
                >
                  {car.plate} · {car.colorName}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Add new car button */}
      <Pressable
        onPress={() => setShowAddCar(true)}
        className="mt-3 flex-row items-center justify-center rounded-2xl border border-dashed border-gray-300 py-3"
        style={{ gap: 6 }}
      >
        <Plus color={colors.ink.secondary} size={16} strokeWidth={2} />
        <Text className="text-sm text-gray-500">{t('checkout.add_car_btn')}</Text>
      </Pressable>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!pickedId || saving}
        className="mt-4 items-center justify-center rounded-2xl"
        style={{
          height: 48,
          backgroundColor: colors.brand.DEFAULT,
          opacity: pickedId && !saving ? 1 : 0.4,
        }}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text className="text-sm text-white">
            {t('checkout.car_modal_save')}
          </Text>
        )}
      </Pressable>
      <AddCarModal
        visible={showAddCar}
        onClose={() => setShowAddCar(false)}
        onSave={(newCar) => {
          savedCars.push(newCar);
          setPickedId(newCar.id);
          setShowAddCar(false);
        }}
      />
    </ModalShell>
  );
}
