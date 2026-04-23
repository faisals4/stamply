import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { Price } from '../detail/Price';
import type { Product } from '../types';

type Props = {
  items: Product[];
  onItemPress: (item: Product) => void;
  onAdd: (item: Product) => void;
};

const CARD_WIDTH = 130;
const CARD_IMAGE_HEIGHT = 104; // 5:4 aspect with 130 width
const ADD_BUTTON_SIZE = 36;

/**
 * Horizontal scroller of "add with your order" suggestions shown
 * below the notes section. Each card is 130 px wide with a
 * landscape image (5:4), a rounded `+` button floating at the
 * bottom start of the image, and name + price below.
 *
 * The whole card is tappable — `onItemPress` opens the nested
 * product's detail screen — and the `+` button short-circuits
 * into `onAdd` instead.
 *
 * Renders nothing when `items` is empty so the parent doesn't
 * need to guard the visibility itself.
 */
export function ProductCrossSelling({ items, onItemPress, onAdd }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  if (items.length === 0) return null;

  return (
    <View className="mt-4 border-t border-gray-100 pt-4">
      <Text
        style={localeDirStyle}
        className="mb-3 text-start text-sm font-bold text-gray-900"
      >
        {t('product_detail.cross_selling_title')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onItemPress(item)}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            style={{ width: CARD_WIDTH }}
          >
            {/* Image block with the floating add button. */}
            <View
              className="relative"
              style={{
                width: '100%',
                height: CARD_IMAGE_HEIGHT,
                backgroundColor: '#F3F4F6',
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                resizeMode="cover"
              />
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAdd(item);
                }}
                hitSlop={6}
                className="absolute bottom-2 start-2 items-center justify-center rounded-full border border-gray-200 bg-white"
                style={{ width: ADD_BUTTON_SIZE, height: ADD_BUTTON_SIZE }}
              >
                <Plus color={colors.ink.primary} size={16} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Name + price strip. */}
            <View className="p-2">
              <Text
                style={localeDirStyle}
                className="text-start text-xs font-bold text-gray-900"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View className="mt-1">
                <Price amount={item.price} size={12} bold />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
