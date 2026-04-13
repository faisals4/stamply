import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../../lib/useLocaleDirStyle';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const MAX_LENGTH = 250;

/**
 * Free-text notes field rendered below the addons list. A
 * multiline `TextInput` inside a gray card, capped at 250
 * characters to match the reference design. Controlled — the
 * parent screen owns the string.
 */
export function ProductNotes({ value, onChange }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();

  return (
    <View className="mt-4 border-t border-gray-100 pt-4">
      <Text
        style={localeDirStyle}
        className="mb-3 text-start text-sm font-bold text-gray-900"
      >
        {t('product_detail.notes')}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('product_detail.notes_placeholder') as string}
        placeholderTextColor="#9CA3AF"
        multiline
        maxLength={MAX_LENGTH}
        className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900"
        style={[
          localeDirStyle,
          { minHeight: 80, textAlignVertical: 'top', outlineStyle: 'none' } as any,
        ]}
      />
    </View>
  );
}
