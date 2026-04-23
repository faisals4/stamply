import { View, Text, TextInput } from 'react-native';
import { onlyDigits } from '../lib/digits';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

/**
 * Saudi-first phone input: fixed `+966` prefix on the visual LEFT,
 * followed by a 9-digit national number field. The caller receives
 * the raw 9-digit string; combine it with `+966` before sending to
 * the backend.
 *
 * The whole control is force-LTR via `direction: 'ltr'` on the row
 * so the prefix chip stays anchored to the left and the digits
 * always read left-to-right — even when the surrounding app locale
 * is Arabic and `<html dir="rtl">` is set on the document. Without
 * this the chip ends up on the right of the field in RTL, which
 * reads as a "966+" prefix and makes the whole thing look wrong.
 */
export function PhoneInput({ value, onChange, placeholder }: Props) {
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#ffffff',
        // Pin the row to LTR so the prefix chip is always on the
        // visual left regardless of the app/document locale.
        direction: 'ltr',
      }}
    >
      <View
        style={{
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRightWidth: 1,
          borderRightColor: '#E5E7EB',
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
          +966
        </Text>
      </View>
      <TextInput
        style={{
          height: '100%',
          flex: 1,
          paddingHorizontal: 16,
          fontSize: 16,
          color: '#111827',
          textAlign: 'left',
          writingDirection: 'ltr',
        }}
        keyboardType="number-pad"
        maxLength={9}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={(t) => onChange(onlyDigits(t))}
      />
    </View>
  );
}
