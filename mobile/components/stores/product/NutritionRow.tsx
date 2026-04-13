import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../../lib/rtl';
import { colors } from '../../../lib/colors';
import { InfoPopup } from './InfoPopup';
import type { Product } from '../types';

type Props = {
  product: Product;
};

/**
 * Three-button nutrition row rendered below the product meta
 * block. Mirrors the reference design:
 *
 *   [ 🔥 N سعرة حرارية ]   [ ⓘ تنبيهات ]   [ ⓘ الحقائق الغذائية ]
 *
 * The first button is purely informational (no tap handler). The
 * second and third open a centered `InfoPopup` with the allergens
 * list and the nutrition-facts table respectively. Both popups
 * are instances of the same reusable shell so this component
 * stays focused on the row-level presentation.
 *
 * When the underlying product has no calories / allergens /
 * nutrition facts the corresponding button is hidden.
 */
export function NutritionRow({ product }: Props) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const [allergensOpen, setAllergensOpen] = useState(false);
  const [factsOpen, setFactsOpen] = useState(false);

  const hasCalories = product.calories !== undefined;
  const hasAllergens = (product.allergens?.length ?? 0) > 0;
  const hasFacts = (product.nutritionFacts?.length ?? 0) > 0;

  if (!hasCalories && !hasAllergens && !hasFacts) return null;

  return (
    <>
      <View className="mx-5 mt-4 border-t border-gray-100 pt-4">
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 24 }}
        >
          {hasCalories ? (
            <RowButton
              icon={<Flame color={colors.ink.secondary} size={16} strokeWidth={2} />}
              label={`${product.calories} ${t('product_detail.calories')}`}
            />
          ) : null}

          {hasAllergens ? (
            <RowButton
              icon={<Info color={colors.ink.secondary} size={16} strokeWidth={2} />}
              label={t('product_detail.allergens')}
              onPress={() => setAllergensOpen(true)}
            />
          ) : null}

          {hasFacts ? (
            <RowButton
              icon={<Info color={colors.ink.secondary} size={16} strokeWidth={2} />}
              label={t('product_detail.nutrition_facts')}
              onPress={() => setFactsOpen(true)}
            />
          ) : null}
        </View>
      </View>

      {/* Allergens popup — simple list of labels, each preceded by
          a small bullet disc so the list reads as structured even
          in both directions. */}
      <InfoPopup
        visible={allergensOpen}
        onClose={() => setAllergensOpen(false)}
        title={t('product_detail.allergens')}
        maxWidth={280}
      >
        <View style={{ gap: 8 }}>
          {product.allergens?.map((label) => (
            <View
              key={label}
              className="flex-row items-center"
              style={{ gap: 8 }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.ink.tertiary,
                }}
              />
              <Text
                style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
                className="text-xs text-gray-700"
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </InfoPopup>

      {/* Nutrition facts popup — 2-column grid of label/value
          pairs. Column direction is flex-row so it flips with
          RTL/LTR naturally. */}
      <InfoPopup
        visible={factsOpen}
        onClose={() => setFactsOpen(false)}
        title={t('product_detail.nutrition_facts')}
        maxWidth={340}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            rowGap: 8,
          }}
        >
          {product.nutritionFacts?.map((fact) => (
            <View
              key={fact.label}
              className="flex-row items-center justify-between"
              style={{ width: '50%', paddingHorizontal: 6, gap: 6 }}
            >
              <Text
                style={{ writingDirection: isRTL ? 'rtl' : 'ltr' }}
                className="text-xs text-gray-700"
                numberOfLines={1}
              >
                {fact.label}
              </Text>
              <Text className="text-xs text-gray-900">
                {fact.value}
              </Text>
            </View>
          ))}
        </View>
      </InfoPopup>
    </>
  );
}

/**
 * One of the three inline buttons in the nutrition row. Kept as
 * a local subcomponent because its only consumer is this file —
 * it doesn't deserve its own module.
 */
function RowButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  const inner = (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      {icon}
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {inner}
    </Pressable>
  );
}
