import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { surfaces } from '../../lib/surfaces';
import { colors } from '../../lib/colors';

/**
 * Visual sizing constants for the search bar. Kept at module top so
 * the JSX below stays declarative and free of magic numbers. Tweak
 * these to restyle the whole component without hunting through the
 * markup.
 */
const SEARCH_ICON_SIZE = 18;
const SEARCH_ICON_STROKE = 1.6;
const CLEAR_BUTTON_SIZE = 20;
const CLEAR_ICON_SIZE = 12;
const CLEAR_ICON_STROKE = 2.5;
const CLEAR_HIT_SLOP = 8;

type Props = {
  /** Current search query. The parent owns this state. */
  value: string;
  /** Called on every keystroke and when the clear button is pressed. */
  onChange: (next: string) => void;
};

/**
 * Rounded search input that drives the live merchant filter on the
 * Stores screen. Controlled — the parent owns the search string.
 *
 * Layout is a single flex row (icon | input | clear button) so RTL
 * vs LTR is handled natively by `direction` inheritance without any
 * per-locale branching.
 *
 * The 16-px font-size enforced by `mobile/global.css` ensures iOS
 * Safari does not auto-zoom into this field on focus, regardless of
 * the `text-sm` className applied here for visual sizing parity with
 * the rest of the screen.
 */
export function StoresSearchBar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const hasValue = value.length > 0;

  return (
    <View className={`mx-4 mb-4 flex-row items-center ${surfaces.card} px-4 py-3`}>
      <Search
        color={colors.ink.tertiary}
        size={SEARCH_ICON_SIZE}
        strokeWidth={SEARCH_ICON_STROKE}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('stores.search_placeholder')}
        placeholderTextColor={colors.ink.tertiary}
        className="ms-3 flex-1 text-start text-sm text-gray-900"
        // Strip the default focus ring on react-native-web so the
        // input matches Stamply's clean rounded-2xl input style.
        style={{ outlineStyle: 'none' } as any}
      />
      {hasValue ? (
        <ClearButton
          label={t('stores.clear_search') as string}
          onPress={() => onChange('')}
        />
      ) : null}
    </View>
  );
}

/**
 * Compact pill-shaped button that clears the search field. Rendered
 * only when the input is non-empty; sits at the inline-end of the
 * flex row and inherits direction from the parent so it swaps sides
 * in RTL vs LTR.
 */
function ClearButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={CLEAR_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="ms-2 items-center justify-center rounded-full bg-gray-200"
      style={{ width: CLEAR_BUTTON_SIZE, height: CLEAR_BUTTON_SIZE }}
    >
      <X
        color={colors.ink.primary}
        size={CLEAR_ICON_SIZE}
        strokeWidth={CLEAR_ICON_STROKE}
      />
    </Pressable>
  );
}
