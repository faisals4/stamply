import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Modal, Platform,
  type ListRenderItem,
} from 'react-native';
import { Search, X, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../lib/rtl';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ScreenContainer } from '../ScreenContainer';

type Props<T> = {
  /** Controls visibility. */
  visible: boolean;
  /** Called when the user closes the modal (back arrow or backdrop). */
  onClose: () => void;
  /** Placeholder text inside the search input. */
  placeholder?: string;
  /** Called on every keystroke with the current query. The parent should
   *  filter and pass updated `items` in response. */
  onSearch: (query: string) => void;
  /** The filtered list of items to render. */
  items: T[];
  /** Render a single result row. */
  renderItem: ListRenderItem<T>;
  /** Unique key extractor for FlatList. */
  keyExtractor: (item: T, index: number) => string;
  /** Optional initial search value (e.g. when re-opening with a previous query). */
  initialQuery?: string;
  /** Optional empty state text when items is []. */
  emptyText?: string;
  /** Auto-focus the input when the modal opens. Default true. */
  autoFocus?: boolean;
};

/**
 * Full-screen search modal — reusable across the app.
 *
 * Opens as a full-screen overlay with:
 *   - Header: back arrow + search input + clear button
 *   - Body: FlatList of results (provided by the parent)
 *   - Empty state when no results
 *
 * The parent owns the data and filtering logic. This component only
 * provides the UI shell: open/close, input handling, and list rendering.
 *
 * Usage:
 * ```tsx
 * <SearchModal
 *   visible={searchOpen}
 *   onClose={() => setSearchOpen(false)}
 *   placeholder="ابحث عن المتاجر"
 *   onSearch={(q) => setQuery(q)}
 *   items={filteredStores}
 *   renderItem={({ item }) => <StoreRow store={item} />}
 *   keyExtractor={(s) => s.id}
 * />
 * ```
 */
export function SearchModal<T>({
  visible,
  onClose,
  placeholder,
  onSearch,
  items,
  renderItem,
  keyExtractor,
  initialQuery = '',
  emptyText,
  autoFocus = true,
}: Props<T>) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const localeDirStyle = useLocaleDirStyle();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(initialQuery);

  // Reset query when modal opens
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      onSearch(initialQuery);
      if (autoFocus) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [visible]);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    onSearch(text);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'ios' ? 54 : 0 }}>
       <ScreenContainer>
        {/* Header: back + search input */}
        <View
          className="flex-row items-center border-b border-gray-100 bg-white px-3"
          style={{ height: 56, gap: 8 }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="items-center justify-center rounded-full"
            style={{ width: 36, height: 36, backgroundColor: '#F0F0F0' }}
          >
            <BackIcon color={colors.navIcon} size={18} strokeWidth={2} />
          </Pressable>

          <View
            className="flex-1 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4"
            style={{ height: 46, gap: 8 }}
          >
            <Search color={colors.ink.tertiary} size={18} strokeWidth={1.6} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleChange}
              placeholder={placeholder}
              placeholderTextColor={colors.ink.tertiary}
              style={[
                localeDirStyle,
                {
                  flex: 1,
                  fontSize: 14,
                  color: colors.ink.primary,
                  outlineStyle: 'none',
                } as any,
              ]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <View
                  className="items-center justify-center rounded-full bg-gray-200"
                  style={{ width: 20, height: 20 }}
                >
                  <X color={colors.ink.primary} size={12} strokeWidth={2.5} />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.length > 0 ? (
              <View className="items-center py-16" style={{ gap: 8 }}>
                <Search color={colors.ink.tertiary} size={32} strokeWidth={1} />
                <Text style={localeDirStyle} className="text-center text-sm text-gray-400">
                  {emptyText ?? t('stores.no_results')}
                </Text>
              </View>
            ) : null
          }
        />
       </ScreenContainer>
      </View>
    </Modal>
  );
}
