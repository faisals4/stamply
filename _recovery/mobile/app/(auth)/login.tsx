import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../lib/api';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { defaultCountry, sanitizePhone, type Country } from '../../lib/countries';

/**
 * Phone entry screen. Collects a mobile number with country selector,
 * and calls POST /api/app/auth/otp/request. On success, pushes to
 * /verify with the full phone as a route param.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phone.length === country.maxLength && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const fullPhone = country.dialCode + phone;
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

      <Text style={localeDirStyle} className="mb-2 text-3xl font-bold text-gray-900">{t('login.title')}</Text>
      <Text style={localeDirStyle} className="mb-8 text-base font-normal leading-6 text-gray-500">
        {t('login.subtitle')}
      </Text>

      <Text style={localeDirStyle} className="mb-2 text-sm font-normal text-gray-700">
        {t('login.phone_label')}
      </Text>
      <PhoneInput
        value={phone}
        onChange={(v) => setPhone(sanitizePhone(v, country))}
        country={country}
        onCountryChange={(c) => { setCountry(c); setPhone(''); }}
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
