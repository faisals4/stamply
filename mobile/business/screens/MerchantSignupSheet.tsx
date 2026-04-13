import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { FormInput } from '../../components/ui/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { BottomSheet } from '../../components/BottomSheet';
import { useMerchantAuth, merchantApi } from '../lib/merchant-auth';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Merchant signup bottom sheet — same BottomSheet primitive as login.
 *
 * Fields: brand name, name, email, password →
 * calls `POST /api/signup` → on success auto-login + navigate to dashboard.
 */
export function MerchantSignupSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const { login } = useMerchantAuth();

  const [brandName, setBrandName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-generate subdomain from brand name (same logic as web)
  const handleBrandChange = (v: string) => {
    setBrandName(v);
    if (!subdomainTouched) {
      const slug = v.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 20);
      setSubdomain(slug);
    }
  };

  // Sanitize manual subdomain input: only a-z, 0-9, dash, no spaces, max 20
  const handleSubdomainChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    setSubdomain(clean);
    setSubdomainTouched(true);
  };

  const canSubmit =
    brandName.trim().length > 0 &&
    subdomain.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 3 &&
    password.length >= 8;

  const handleSignup = async () => {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      await merchantApi.signup({
        brand_name: brandName.trim(),
        subdomain: subdomain.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Auto-login with the same credentials
      await login(email.trim(), password);
      onClose();
      router.replace('/merchant-dashboard' as any);
    } catch (e: any) {
      setError(e.message ?? t('merchant.signup_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-5 pb-6" style={{ gap: 16 }}>
          {/* Brand header */}
          <View className="items-center" style={{ gap: 6 }}>
            <Image source={require('../../assets/logo-stamply.png')} style={{ height: 28, width: 100 }} resizeMode="contain" />
            <Text style={localeDirStyle} className="text-center text-sm text-gray-500">
              {t('merchant.signup_subtitle')}
            </Text>
          </View>

          {/* Brand name */}
          <FormInput
            label={t('merchant.signup_brand_name')}
            value={brandName}
            onChangeText={handleBrandChange}
            placeholder={t('merchant.signup_brand_placeholder')}
            fullWidth
          />

          {/* Subdomain */}
          <View style={{ gap: 4 }}>
            <FormInput
              label={t('merchant.signup_subdomain')}
              value={subdomain}
              onChangeText={handleSubdomainChange}
              maxLength={20}
              placeholder="my-cafe"
              ltr
              fullWidth
            />
            <Text className="text-3xs text-gray-400" style={{ direction: 'ltr', textAlign: 'left' }}>
              {t('merchant.signup_subdomain_hint')}: stamply.cards/c/<Text className="font-bold">{subdomain || '...'}</Text>
            </Text>
          </View>

          {/* Section: admin details */}
          <View className="border-t border-gray-100 pt-3" style={{ gap: 4 }}>
            <Text style={localeDirStyle} className="text-start text-xs text-gray-400">
              {t('merchant.signup_admin_section')}
            </Text>
          </View>

          {/* Full name */}
          <FormInput
            label={t('merchant.signup_name')}
            value={name}
            onChangeText={setName}
            placeholder={t('merchant.signup_name_placeholder')}
            fullWidth
          />

          {/* Email */}
          <FormInput
            label={t('merchant.email')}
            value={email}
            onChangeText={(v) => setEmail(v.replace(/[^a-zA-Z0-9@._+-]/g, '').replace(/\s/g, ''))}
            placeholder={t('merchant.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            ltr
            fullWidth
          />

          {/* Password */}
          <View style={{ gap: 4 }}>
            <FormInput
              label={t('merchant.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('merchant.signup_password_placeholder')}
              secureTextEntry
              ltr
              fullWidth
            />
            <Text style={localeDirStyle} className="text-start text-3xs text-gray-400">
              {t('merchant.password_hint')}
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <Text className="text-center text-xs" style={{ color: colors.state.danger }}>
              {error}
            </Text>
          ) : null}

          {/* Signup CTA */}
          <PrimaryButton
            label={t('merchant.signup_cta')}
            onPress={handleSignup}
            loading={loading}
            disabled={!canSubmit}
            color="#003BC0"
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
