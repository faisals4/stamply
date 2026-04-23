import { forwardRef } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';

type Props = {
  /** Label shown above the input. */
  label?: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
  multiline?: boolean;
  /** Force LTR direction (for numbers, coordinates, emails). */
  ltr?: boolean;
  /** Disabled / read-only state — grayed out background. */
  locked?: boolean;
  /** When true, input takes full width. Default: flex-1. */
  fullWidth?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** Override border color (e.g. for validation errors). */
  borderColor?: string;
  /** Email mode: strips spaces and non-ASCII characters, forces LTR. */
  emailMode?: boolean;
  /** Keyboard return key type. */
  returnKeyType?: TextInputProps['returnKeyType'];
  /** Called when the return key is pressed. */
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};

/**
 * Shared labeled text input used across the entire app.
 *
 * Provides consistent styling for all form fields: merchant card
 * editor, location editor, customer profile, login sheet, etc.
 *
 * Features:
 * - Optional label above the input
 * - RTL/LTR support via `useLocaleDirStyle()` (or forced LTR)
 * - Locked/disabled state with gray background
 * - Multiline support (auto-grows to 80px)
 * - No blue focus outline on web (`outlineWidth: 0`)
 * - Uses `colors.ink.border` token (not hardcoded hex)
 */
export const FormInput = forwardRef<TextInput, Props>(function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
  ltr,
  locked,
  fullWidth,
  secureTextEntry,
  autoCapitalize,
  borderColor: borderColorOverride,
  emailMode,
  returnKeyType,
  onSubmitEditing,
}, ref) {
  const localeDirStyle = useLocaleDirStyle();
  const forceLtr = ltr || emailMode;

  // Email mode: strip spaces + non-ASCII (Arabic, emoji, etc.)
  const handleChange = emailMode
    ? (v: string) => onChangeText?.(v.replace(/[^a-zA-Z0-9@._+\-]/g, ''))
    : onChangeText;

  return (
    <View style={fullWidth ? { gap: 4 } : { flex: 1, gap: 4 }}>
      {label ? (
        <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        style={[
          forceLtr ? { direction: 'ltr' as const, textAlign: 'left' as const } : localeDirStyle,
          {
            borderWidth: 1,
            borderColor: borderColorOverride ?? (locked ? colors.ink.softBorder : colors.ink.border),
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 10 : 0,
            height: multiline ? 80 : 42,
            fontSize: 13,
            color: locked ? colors.ink.tertiary : colors.ink.primary,
            backgroundColor: locked ? colors.ink.softBorder : colors.white,
            textAlignVertical: multiline ? ('top' as const) : ('center' as const),
            outlineWidth: 0,
          } as any,
        ]}
        value={value}
        onChangeText={locked ? undefined : handleChange}
        editable={!locked}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.tertiary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={returnKeyType === 'next' ? false : true}
      />
    </View>
  );
});
