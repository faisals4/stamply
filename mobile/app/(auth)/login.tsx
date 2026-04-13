import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../lib/api';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen } from '../../components/auth/AuthScreen';

/**
 * Phone entry screen. Collects a 9-digit Saudi mobile number,
 * prepends +966, and calls POST /api/app/auth/otp/request. On
 * success, pushes to /verify with the full phone as a route param.
 *
 * Errors are rendered inline below the button (not via `Alert.alert`)
 * because on React Native Web the native alert bridge is unreliable:
 * depending on the browser and the iframe context it can silently
 * drop the alert, which left users staring at a spinning button with
 * no visible feedback.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phone.length === 9 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const fullPhone = '+966' + phone;
    try {
      await api.otpRequest(fullPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch (e) {
      const err = e as ApiError;
      const message =
        err.code === 'invalid_phone'
          ? t('errors.invalid_phone')
          : err.code === 'rate_limited' || err.code === 'cooldown'
          ? t('errors.rate_limited')
          : err.status === 0
          ? t('errors.network')
          : t('errors.unknown');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <View className="mb-6 items-center">
        {/* Illustration first, Stamply wordmark second — the
            promotional artwork (a character / scene) acts as
            the emotional hook, and the brand wordmark sits
            underneath as a signature. */}
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/346.png')}
          resizeMode="contain"
          style={{ height: 120, width: 240 }}
        />
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/logo-o.png')}
          accessibilityLabel={t('app_name')}
          resizeMode="contain"
          style={{ height: 56, width: 180, marginTop: 8 }}
        />
      </View>

      <Text className="mb-2 text-3xl font-bold text-gray-900">{t('login.title')}</Text>
      {/* Subtitle in regular weight (not bold) so it reads as
          body copy underneath the "حياك" heading. */}
      <Text className="mb-8 text-base font-normal leading-6 text-gray-500">
        {t('login.subtitle')}
      </Text>

      {/* Form label above the phone field. Regular weight by
          request — this is a short prompt, not a heading. */}
      <Text className="mb-2 text-sm font-normal text-gray-700">
        {t('login.phone_label')}
      </Text>
      <PhoneInput
        value={phone}
        onChange={setPhone}
        placeholder={t('login.phone_placeholder')}
      />

      <View className="mt-6">
        <PrimaryButton
          label={loading ? t('login.sending') : t('login.send_code')}
          onPress={submit}
          loading={loading}
          disabled={!canSubmit}
        />
        {error ? (
          <Text className="mt-3 text-center text-sm text-red-600">
            {error}
          </Text>
        ) : null}
      </View>
    </AuthScreen>
  );
}
