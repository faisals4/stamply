import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../lib/colors';

export type PackageType = 'dine-in' | 'takeaway';

type Props = {
  value: PackageType | null;
  onChange: (type: PackageType) => void;
  isInvalid?: boolean;
};

/**
 * Preparation preference block — shown for pickup orders only.
 * "كيف حاب نجهز طلبك!" with two pills: محلي (Dine-in) and
 * سفري (Takeaway).
 */
export function PreparationPreference({
  value,
  onChange,
  isInvalid = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <View
      className="mx-4 rounded-2xl border bg-white p-4"
      style={{
        borderColor: isInvalid ? colors.state.danger : colors.ink.border,
      }}
    >
      <Text
        className="mb-3 text-center text-sm"
        style={{
          color: isInvalid ? colors.state.danger : colors.ink.primary,
        }}
      >
        {t('checkout.preparation_title')}
      </Text>
      <View
        className="flex-row items-center justify-center"
        style={{ gap: 12 }}
      >
        <PillButton
          label={t('checkout.preparation_dine_in')}
          isActive={value === 'dine-in'}
          onPress={() => onChange('dine-in')}
        />
        <PillButton
          label={t('checkout.preparation_takeaway')}
          isActive={value === 'takeaway'}
          onPress={() => onChange('takeaway')}
        />
      </View>
    </View>
  );
}

function PillButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center rounded-full border"
      style={{
        height: 36,
        maxWidth: 140,
        borderColor: isActive ? colors.brand.DEFAULT : colors.ink.border,
        backgroundColor: isActive ? colors.brand.DEFAULT : 'transparent',
      }}
    >
      <Text
        className="text-xs"
        style={{ color: isActive ? colors.white : colors.ink.primary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
