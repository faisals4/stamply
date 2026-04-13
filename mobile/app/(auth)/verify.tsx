import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../lib/api';
import { setAuth } from '../../lib/auth';
import { onlyDigits } from '../../lib/digits';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { CircleButton } from '../../components/ui/CircleButton';
import { useIsRTL } from '../../lib/rtl';

const CODE_LENGTH = 4;
const RESEND_AFTER_SECONDS = 30;

/**
 * OTP entry screen. Auto-submits once the user fills all 4 digits.
 * The dev master code `0000` is accepted server-side when APP_DEBUG
 * is true — handy for iterating without a real SMS provider.
 */
export default function VerifyScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const params = useLocalSearchParams<{ phone: string }>();
  const phone = params.phone ?? '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SECONDS);
  const inputRef = useRef<TextInput>(null);

  // Autofocus + focus when we remount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Countdown for resend button
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Auto-submit as soon as the code reaches CODE_LENGTH
  useEffect(() => {
    if (code.length === CODE_LENGTH && !loading) {
      submit(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const submit = async (value: string) => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.otpVerify(phone, value);
      await setAuth(res.data.token, res.data.customer);
      router.replace('/(tabs)/cards');
    } catch (e) {
      const err = e as ApiError;
      const message =
        err.code === 'invalid_code'
          ? t('errors.invalid_code')
          : err.code === 'no_account'
          ? t('verify.no_account')
          : err.code === 'too_many_attempts' || err.code === 'rate_limited'
          ? t('errors.rate_limited')
          : err.status === 0
          ? t('errors.network')
          : t('errors.unknown');
      setError(message);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setError(null);
    try {
      await api.otpRequest(phone);
      setResendIn(RESEND_AFTER_SECONDS);
    } catch (e) {
      const err = e as ApiError;
      setError(err.code === 'rate_limited' ? t('errors.rate_limited') : t('errors.unknown'));
    }
  };

  return (
    <AuthScreen
      backButton={
        <CircleButton
          onPress={() => router.back()}
          icon={
            isRTL
              ? <ChevronRight color="#464041" size={20} strokeWidth={2} />
              : <ChevronLeft color="#464041" size={20} strokeWidth={2} />
          }
        />
      }
    >
      <Text className="mb-2 text-3xl font-bold text-gray-900">{t('verify.title')}</Text>
          <Text className="mb-10 text-base leading-6 text-gray-500">
            {/*
             * Wrap the phone number in Unicode LRI/PDI marks so the
             * BiDi algorithm treats it as an isolated left-to-right
             * run inside the surrounding Arabic sentence. Without
             * this the leading "+" gets reordered next to the Arabic
             * text and the number reads incorrectly.
             */}
            {t('verify.subtitle', { phone: `\u2066${phone}\u2069` })}
          </Text>

          {/* Hidden field captures input; the visible boxes below
              render each digit. Force the row to LTR via inline
              `direction: 'ltr'` so the first digit always sits on
              the visual left even when the surrounding app locale
              is Arabic — otherwise the OTP boxes flip right-to-left
              and the first character (`code[0]`) ends up under the
              rightmost box, which reads as the wrong order. */}
          <Pressable onPress={() => inputRef.current?.focus()}>
            <View
              className="justify-center gap-3"
              style={{ flexDirection: 'row', direction: 'ltr' }}
            >
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  className={
                    'h-16 w-14 items-center justify-center rounded-2xl border ' +
                    (code.length === i ? 'border-brand bg-brand-50' : 'border-gray-300 bg-white')
                  }
                >
                  <Text className="text-2xl font-bold text-gray-900">{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          <TextInput
            ref={inputRef}
            className="absolute h-0 w-0 opacity-0"
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(t) => setCode(onlyDigits(t).slice(0, CODE_LENGTH))}
            autoFocus
          />

          <View className="mt-8">
            <PrimaryButton
              label={loading ? t('verify.verifying') : t('verify.verify')}
              onPress={() => submit(code)}
              loading={loading}
              disabled={code.length !== CODE_LENGTH}
            />
            {error ? (
              <Text className="mt-3 text-center text-sm text-red-600">
                {error}
              </Text>
            ) : null}
          </View>

      <Pressable onPress={resend} className="mt-6 items-center">
        <Text className={resendIn > 0 ? 'text-gray-400' : 'text-brand font-semibold'}>
          {resendIn > 0
            ? t('verify.resend_in', { seconds: resendIn })
            : t('verify.resend')}
        </Text>
      </Pressable>
    </AuthScreen>
  );
}
