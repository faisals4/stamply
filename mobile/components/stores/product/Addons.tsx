import {
  View,
  Text,
  Pressable,
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';
import { colors } from '../../../lib/colors';
import { ShakeView } from '../../ui/ShakeView';
import { RadioPin } from '../../ui/RadioPin';
import { CheckboxPin } from '../../ui/CheckboxPin';
import { QuantityControl } from '../detail/QuantityControl';
import { Price } from '../detail/Price';
import { SoldOutBadge } from '../../SoldOutBadge';
import type { AddonGroup, AddonOption } from '../types';

type Props = {
  groups: AddonGroup[];
  /** Flat map: `selections[groupId][optionId] = quantity`. The parent
   *  owns this state and updates via `onSelectionChange`. */
  selections: Record<string, Record<string, number>>;
  onSelectionChange: (groupId: string, optionId: string, quantity: number) => void;
  /** Groups flagged invalid by the validator get a red title + shake
   *  animation treatment. Kept as an array (not a Set) to match the
   *  reference API shape. */
  invalidGroups?: string[];
  /** Monotonically-increasing counter bumped by the parent every
   *  time validation fails. Used to re-trigger the shake animation
   *  on invalid groups even if the invalidGroups array itself is
   *  identical between two failed attempts. */
  shakeToken?: number;
  /** Called by each group card's `onLayout` pass with the y-offset
   *  of the group RELATIVE TO THE ADDONS CONTAINER. The parent
   *  screen adds its own container offset on top of this number
   *  to get an absolute scroll position for the first invalid
   *  group — no `measureLayout` is needed, which matters on
   *  react-native-web where measureLayout against an Animated
   *  component is unreliable. */
  onGroupLayout?: (groupId: string, y: number) => void;
};

/**
 * Stacked list of addon groups (size, flavors, extras, etc.). Each
 * group renders as a bordered card with:
 *
 *   - A title row (bold, optional "Required" chip, red when invalid)
 *   - An optional subtitle caption
 *   - A list of `AddonOptionRow`s with a type-specific picker
 *
 * The three picker types all share a common row skeleton (image +
 * name + calories + price + picker on the inline-end) so swapping
 * between radio/checkbox/quantity feels like a single component with
 * three faces.
 *
 * State is fully lifted — this component is stateless and cannot
 * mutate the cart on its own.
 */
export function Addons({
  groups,
  selections,
  onSelectionChange,
  invalidGroups = [],
  shakeToken = 0,
  onGroupLayout,
}: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    // Vertical gap between group cards is applied as `marginBottom`
    // on each `ShakableGroup` (except the last one) rather than as
    // a parent `gap`, because react-native-web doesn't reliably
    // apply flex gap when the direct children are `Animated.View`
    // with a transform — the gap collapses to 0 and the cards
    // touch each other.
    <View>
      {groups.map((group, index) => {
        const isInvalid = invalidGroups.includes(group.id);
        const totalInGroup = Object.values(selections[group.id] ?? {}).reduce(
          (sum, q) => sum + q,
          0
        );
        const isAtGroupLimit =
          group.maxSelections !== undefined &&
          totalInGroup >= group.maxSelections;
        const isLast = index === groups.length - 1;

        return (
          <ShakeView
            key={group.id}
            shake={isInvalid}
            shakeToken={shakeToken}
          >
            <View
              onLayout={(e) => onGroupLayout?.(group.id, e.nativeEvent.layout.y)}
              style={{
                backgroundColor: '#FAFAFA',
                marginBottom: isLast ? 0 : 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 24,
              }}
            >
            <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
              <Text
                style={[
                  localeDirStyle,
                  isInvalid ? { color: colors.state.danger } : null,
                ]}
                className="flex-1 text-start text-sm font-bold text-gray-900"
              >
                {group.title}
              </Text>
              {group.required ? (
                <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: '#FEF3CD' }}>
                  <Text className="text-3xs font-bold" style={{ color: '#856404' }}>
                    {t('product_detail.required')}
                  </Text>
                </View>
              ) : null}
            </View>

            {group.subtitle ? (
              <Text
                style={localeDirStyle}
                className="mt-1 text-start text-xs text-gray-500"
              >
                {group.subtitle}
              </Text>
            ) : null}

            <View className="mt-3" style={{ gap: 4 }}>
              {group.options.map((option) => (
                <AddonOptionRow
                  key={option.id}
                  group={group}
                  option={option}
                  quantity={selections[group.id]?.[option.id] ?? 0}
                  isGroupAtLimit={isAtGroupLimit}
                  onChange={(qty) =>
                    onSelectionChange(group.id, option.id, qty)
                  }
                />
              ))}
            </View>
            </View>
          </ShakeView>
        );
      })}
    </View>
  );
}



/**
 * One row inside an addon group. Owns no state — it receives the
 * current quantity and an `onChange` callback, and renders the
 * type-specific picker on the inline-end edge.
 *
 * The row is a Pressable wrapper so tapping anywhere on the row
 * (not just the picker glyph) toggles the selection for radio
 * and checkbox groups. Quantity groups leave the wrapper inert —
 * only the `+`/`−` buttons inside the QuantityControl are tappable.
 */
function AddonOptionRow({
  group,
  option,
  quantity,
  isGroupAtLimit,
  onChange,
}: {
  group: AddonGroup;
  option: AddonOption;
  quantity: number;
  isGroupAtLimit: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  const isSelected = quantity > 0;
  const isDisabled = !!option.soldOut || (!isSelected && isGroupAtLimit);

  const toggleFromRow = () => {
    if (isDisabled) return;
    if (group.type === 'radio') {
      onChange(1); // parent clears siblings in radio groups
    } else if (group.type === 'checkbox') {
      onChange(isSelected ? 0 : 1);
    }
  };

  const handleIncrement = () => {
    if (option.maxQuantity && quantity + 1 > option.maxQuantity) return;
    if (isGroupAtLimit) return;
    onChange(quantity + 1);
  };

  const handleDecrement = () => {
    onChange(Math.max(0, quantity - 1));
  };

  const dimStyle = { opacity: isDisabled ? 0.4 : 1 };

  return (
    <Pressable
      onPress={group.type !== 'quantity' ? toggleFromRow : undefined}
      className="py-2"
    >
      {/* Sold-out badge centered across the FULL row width, above
          everything. Stays vivid while the row content below dims. */}
      {option.soldOut ? (
        <View className="mb-1 items-center">
          <SoldOutBadge />
        </View>
      ) : null}

      <View
        className="flex-row items-center justify-between"
        style={{ gap: 12 }}
      >
        {/* Inline-start: optional thumbnail + name + calories. */}
        <View
          className="flex-1 flex-row items-center"
          style={{ gap: 10 }}
        >
          {option.image ? (
            <Image
              source={{ uri: option.image }}
              style={[
                { width: 36, height: 36, borderRadius: 8 },
                dimStyle,
              ]}
              resizeMode="cover"
            />
          ) : null}
          <View className="flex-1">
            <Text
              style={[localeDirStyle, dimStyle]}
              className="text-start text-sm font-medium text-gray-900"
              numberOfLines={2}
            >
              {option.name}
            </Text>
            {option.calories !== undefined ? (
              <View
                className="mt-0.5 flex-row items-center"
                style={[{ gap: 4 }, dimStyle]}
              >
                <Flame
                  color={colors.ink.tertiary}
                  size={10}
                  strokeWidth={2}
                />
                <Text className="text-3xs text-gray-500">
                  {option.calories} {t('product_detail.calories_short')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Inline-end: price + picker. Dimmed as a block when the
            row is disabled since the whole cluster is non-
            interactive in that state. */}
        <View
          className="flex-row items-center"
          style={[{ gap: 8 }, dimStyle]}
        >
          {option.price !== undefined && option.price > 0 ? (
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-900">+ </Text>
              <Price amount={option.price} size={12} />
            </View>
          ) : null}

          {group.type === 'radio' ? (
            <RadioPin selected={isSelected} />
          ) : null}

          {group.type === 'checkbox' ? (
            <CheckboxPin selected={isSelected} />
          ) : null}

          {group.type === 'quantity' ? (
            <QuantityControl
              quantity={quantity}
              onAdd={handleIncrement}
              onRemove={handleDecrement}
              size={28}
              iconSize={14}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}


