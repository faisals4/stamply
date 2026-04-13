import { createElement, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { FormInput } from './ui/FormInput';
import { api, CustomerPayload, Gender, ApiError } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { colors } from '../lib/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  me: CustomerPayload & { tenants_count: number };
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
export function ProfileEditSheet({ visible, onClose, me }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(me));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(toForm(me));
      setError(null);
    }
  }, [visible, me]);

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
    mutation.mutate(form);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} align="top">
      <View style={{ flex: 1 }}>
        {/* Header — title only */}
        <View className="items-center border-b border-gray-100 px-5 pb-3 pt-2">
          <Text className="text-base text-gray-900">
            {t('settings.edit_profile')}
          </Text>
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          ) : null}

          {/* First + Last name share one row so the two halves of the
              customer's name line up naturally instead of stacking. */}
          <View className="flex-row" style={{ gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label={t('profile.first_name')} />
              <Input
                value={form.first_name}
                onChange={(v) => setForm((s) => ({ ...s, first_name: v }))}
                placeholder={t('profile.first_name_placeholder')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label={t('profile.last_name')} />
              <Input
                value={form.last_name}
                onChange={(v) => setForm((s) => ({ ...s, last_name: v }))}
                placeholder={t('profile.last_name_placeholder')}
              />
            </View>
          </View>

          {/* Email */}
          <FieldLabel label={t('profile.email')} className="mt-4" />
          <Input
            value={form.email}
            onChange={(v) => setForm((s) => ({ ...s, email: v }))}
            placeholder={t('profile.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Birthdate */}
          <FieldLabel label={t('profile.birthdate')} className="mt-4" />
          <DateInput
            value={form.birthdate}
            onChange={(v) => setForm((s) => ({ ...s, birthdate: v }))}
          />
          <Text className="mt-1 text-xs text-gray-400">
            {t('profile.birthdate_hint')}
          </Text>

          {/* Gender */}
          <FieldLabel label={t('profile.gender')} className="mt-4" />
          <View className="flex-row" style={{ gap: 12 }}>
            <GenderChip
              label={t('profile.gender_male')}
              active={form.gender === 'male'}
              onPress={() => setForm((s) => ({ ...s, gender: 'male' }))}
            />
            <GenderChip
              label={t('profile.gender_female')}
              active={form.gender === 'female'}
              onPress={() => setForm((s) => ({ ...s, gender: 'female' }))}
            />
          </View>
        </ScrollView>

        {/* Footer — Cancel + Save pinned at the bottom of the sheet.
            Not part of the ScrollView so they're always reachable
            regardless of how tall the form grows. */}
        <View
          className="flex-row border-t border-gray-100 px-5 py-4"
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
}: {
  label: string;
  className?: string;
}) {
  return (
    <Text className={`mb-2 text-sm text-gray-700 ${className}`}>{label}</Text>
  );
}

function Input({ value, onChange, placeholder, keyboardType, autoCapitalize }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'email-address'; autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return <FormInput value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} autoCapitalize={autoCapitalize} fullWidth />;
}

/**
 * Birthdate input. On web we render a real `<input type="date">` via
 * React.createElement('input') so the platform date picker works out
 * of the box — we can't use RN's `<TextInput>` because it doesn't
 * expose the underlying HTML `type` attribute in its typings. On
 * native we fall back to a masked text input; integrating
 * `@react-native-community/datetimepicker` is a follow-up.
 */
function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
        lineHeight: '52px',
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
      value={value}
      onChangeText={onChange}
      placeholder="1990-05-15"
      placeholderTextColor={colors.ink.tertiary}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
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
}

function GenderChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? colors.brand.DEFAULT : colors.ink.divider,
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
