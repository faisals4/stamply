import { createElement, useEffect, useState, useRef, forwardRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { FormInput } from './ui/FormInput';
import { api, CustomerPayload, Gender, ApiError } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { colors } from '../lib/colors';
import { useLocaleDirStyle } from '../lib/useLocaleDirStyle';

type Props = {
  visible: boolean;
  onClose: () => void;
  me: CustomerPayload & { tenants_count: number };
  /** 'edit' = normal edit (settings), 'reminder' = completion prompt (cards) */
  mode?: 'edit' | 'reminder';
};

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  birthdate: string; // YYYY-MM-DD
  gender: Gender | null;
};

function toForm(me: CustomerPayload): FormState {
  return {
    first_name: me.first_name ?? '',
    last_name: me.last_name ?? '',
    email: me.email ?? '',
    birthdate: me.birthdate ?? '',
    gender: me.gender,
  };
}

/**
 * Customer profile edit modal.
 *
 * Layout:
 *   - Header: centered title only (title-only row with a bottom border).
 *   - Body: scrollable form. First + last name share one row, the rest
 *     are full-width rows below.
 *   - Footer: Cancel + Save pinned to the bottom of the sheet via a
 *     non-scrolling action row, so the primary actions are always
 *     reachable regardless of form length.
 *
 * Validation is deliberately lightweight — the backend is authoritative
 * and will 422 with a proper message if something is off; we just
 * surface that text in the inline error area at the top of the body.
 */
export function ProfileEditSheet({ visible, onClose, me, mode = 'edit' }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(me));
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Input refs for tab/next navigation
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const birthdateRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setForm(toForm(me));
      setError(null);
      setInvalidFields(new Set());
    }
  }, [visible, me]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const mutation = useMutation({
    mutationFn: async (patch: FormState) => {
      // Normalize: empty string → null so the backend clears the
      // field (matches the controller contract).
      const body = {
        first_name: patch.first_name.trim() || null,
        last_name: patch.last_name.trim() || null,
        email: patch.email.trim() || null,
        birthdate: patch.birthdate.trim() || null,
        gender: patch.gender,
      };
      return api.updateMe(body);
    },
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.me(), res.data);
      onClose();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const body = err.body as { errors?: Record<string, string[]>; message?: string };
        const firstMsg =
          body?.errors && Object.values(body.errors)[0]?.[0]
            ? Object.values(body.errors)[0][0]
            : body?.message;
        setError(firstMsg ?? t('errors.unknown'));
      } else {
        setError(t('errors.unknown'));
      }
    },
  });

  const save = () => {
    setError(null);
    // Validate required fields (all except birthdate)
    const missing = new Set<string>();
    if (!form.first_name.trim()) missing.add('first_name');
    if (!form.last_name.trim()) missing.add('last_name');
    if (!form.email.trim()) missing.add('email');
    if (!form.gender) missing.add('gender');

    if (missing.size > 0) {
      setInvalidFields(missing);
      triggerShake();
      return;
    }
    setInvalidFields(new Set());
    mutation.mutate(form);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} align="top">
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <View className="items-center border-b border-gray-100 px-5 pb-3 pt-2" style={{ gap: 4 }}>
          <Text style={localeDirStyle} className="text-base font-bold text-gray-900">
            {mode === 'reminder' ? t('profile.reminder_title') : t('settings.edit_profile')}
          </Text>
          {mode === 'reminder' && (
            <Text style={localeDirStyle} className="text-center text-xs text-gray-500">
              {t('profile.reminder_subtitle')}
            </Text>
          )}
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text style={localeDirStyle} className="text-sm text-red-600">{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <View className="flex-row" style={{ gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel label={t('profile.first_name')} dirStyle={localeDirStyle} invalid={invalidFields.has('first_name')} />
                <Input
                  ref={firstNameRef}
                  value={form.first_name}
                  onChange={(v) => { setForm((s) => ({ ...s, first_name: v })); setInvalidFields((p) => { const n = new Set(p); n.delete('first_name'); return n; }); }}
                  placeholder={t('profile.first_name_placeholder')}
                  invalid={invalidFields.has('first_name')}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel label={t('profile.last_name')} dirStyle={localeDirStyle} invalid={invalidFields.has('last_name')} />
                <Input
                  ref={lastNameRef}
                  value={form.last_name}
                  onChange={(v) => { setForm((s) => ({ ...s, last_name: v })); setInvalidFields((p) => { const n = new Set(p); n.delete('last_name'); return n; }); }}
                  placeholder={t('profile.last_name_placeholder')}
                  invalid={invalidFields.has('last_name')}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            <FieldLabel label={t('profile.email')} className="mt-4" dirStyle={localeDirStyle} invalid={invalidFields.has('email')} />
            <Input
              ref={emailRef}
              value={form.email}
              onChange={(v) => { setForm((s) => ({ ...s, email: v })); setInvalidFields((p) => { const n = new Set(p); n.delete('email'); return n; }); }}
              placeholder={t('profile.email_placeholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              invalid={invalidFields.has('email')}
              emailMode
              returnKeyType="next"
              onSubmitEditing={() => birthdateRef.current?.focus()}
            />

            <FieldLabel label={t('profile.birthdate')} className="mt-4" dirStyle={localeDirStyle} />
            <DateInput
              ref={birthdateRef}
              value={form.birthdate}
              onChange={(v) => setForm((s) => ({ ...s, birthdate: v }))}
            />
            <Text style={localeDirStyle} className="mt-1 text-xs text-gray-400">
              {t('profile.birthdate_hint')}
            </Text>

            <FieldLabel label={t('profile.gender')} className="mt-4" dirStyle={localeDirStyle} invalid={invalidFields.has('gender')} />
            <View className="flex-row" style={{ gap: 12 }}>
              <GenderChip
                label={t('profile.gender_male')}
                active={form.gender === 'male'}
                invalid={invalidFields.has('gender')}
                onPress={() => { setForm((s) => ({ ...s, gender: 'male' })); setInvalidFields((p) => { const n = new Set(p); n.delete('gender'); return n; }); }}
              />
              <GenderChip
                label={t('profile.gender_female')}
                active={form.gender === 'female'}
                invalid={invalidFields.has('gender')}
                onPress={() => { setForm((s) => ({ ...s, gender: 'female' })); setInvalidFields((p) => { const n = new Set(p); n.delete('gender'); return n; }); }}
              />
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer — Cancel + Save pinned at the bottom of the sheet.
            Not part of the ScrollView so they're always reachable
            regardless of how tall the form grows. */}
        <View
          className="flex-row border-t border-gray-100 px-5 pt-3 pb-6"
          style={{ gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('settings.cancel')}
              onPress={onClose}
              variant="ghost"
              disabled={mutation.isPending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('settings.save')}
              onPress={save}
              loading={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

/* ─── Subcomponents ──────────────────────────────────────────── */

function FieldLabel({
  label,
  className = '',
  dirStyle,
  invalid,
}: {
  label: string;
  className?: string;
  dirStyle?: { writingDirection: 'rtl' | 'ltr' };
  invalid?: boolean;
}) {
  return (
    <Text style={[dirStyle, invalid && { color: '#dc2626' }]} className={`mb-2 text-sm ${invalid ? '' : 'text-gray-700'} ${className}`}>{label}{invalid ? ' *' : ''}</Text>
  );
}

const Input = forwardRef<TextInput, {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'email-address'; autoCapitalize?: 'none' | 'sentences' | 'words';
  invalid?: boolean; emailMode?: boolean;
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
}>(({ value, onChange, placeholder, keyboardType, autoCapitalize, invalid, emailMode, returnKeyType, onSubmitEditing }, ref) => {
  return <FormInput ref={ref} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} autoCapitalize={autoCapitalize} fullWidth borderColor={invalid ? '#dc2626' : undefined} emailMode={emailMode} returnKeyType={returnKeyType} onSubmitEditing={onSubmitEditing} />;
});

/**
 * Birthdate input. On web we render a real `<input type="date">` via
 * React.createElement('input') so the platform date picker works out
 * of the box — we can't use RN's `<TextInput>` because it doesn't
 * expose the underlying HTML `type` attribute in its typings. On
 * native we fall back to a masked text input; integrating
 * `@react-native-community/datetimepicker` is a follow-up.
 */
const DateInput = forwardRef<TextInput, {
  value: string;
  onChange: (v: string) => void;
}>(function DateInput({ value, onChange }, ref) {
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      placeholder: 'YYYY-MM-DD',
      style: {
        // iOS Safari renders <input type="date"> with its own native
        // controls and reserves an intrinsic min-width wider than the
        // parent card, which makes the field bleed past the card edge.
        // Resetting -webkit-appearance + explicitly zeroing min-width
        // tells the input to respect width:100% like every other
        // field in the sheet. `appearance: none` covers non-WebKit
        // browsers so the reset stays consistent across platforms.
        WebkitAppearance: 'none',
        appearance: 'none',
        minWidth: 0,
        display: 'block',
        height: 52,
        // Explicit lineHeight = height keeps the value vertically
        // centered inside the box. Without this, iOS Safari — once
        // -webkit-appearance is neutralized — falls back to the
        // default baseline (content glued to the top edge) and the
        // "15 May 1990" text drifts to the top of the field, out of
        // alignment with the neighbouring <TextInput> fields.
        lineHeight: '50px',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.ink.divider,
        borderStyle: 'solid',
        backgroundColor: colors.white,
        paddingLeft: 16,
        paddingRight: 16,
        fontSize: 16,
        color: colors.ink.primary,
        direction: 'ltr',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      },
    });
  }

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors.ink.tertiary}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      returnKeyType="done"
      style={{
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.ink.divider,
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.ink.primary,
      }}
    />
  );
});

function GenderChip({
  label,
  active,
  onPress,
  invalid,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  invalid?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 52,
        borderRadius: 14,
        borderWidth: active ? 1 : invalid ? 1.5 : 1,
        borderColor: active ? colors.brand.DEFAULT : invalid ? '#dc2626' : colors.ink.divider,
        backgroundColor: active ? colors.brand[50] : colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        className="text-base"
        style={{ color: active ? colors.brand.DEFAULT : colors.ink.strong }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
