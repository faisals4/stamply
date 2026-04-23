import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { FormInput } from '../../components/ui/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { BottomSheet } from '../../components/BottomSheet';
import { sanitizePassword } from '../../lib/sanitizePassword';
import { useMerchantAuth } from '../lib/merchant-auth';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Merchant login bottom sheet — same BottomSheet primitive used by
 * ConfirmSheet (logout) and CardDetailsSheet (card detail). Slides
 * up from the bottom with drag-to-dismiss.
 *
 * Two fields: email + password → calls `POST /api/login` →
 * on success navigates to `/merchant-dashboard` and closes.
 */
export function MerchantLoginSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const localeDirStyle = useLocaleDirStyle();
  const { login, isLoading } = useMerchantAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleLogin = async () => {
    if (!canSubmit || isLoading) return;
    setError('');
    try {
      await login(email.trim(), password);
      onClose();
      // Replace (not push) so the back button from dashboard
      // goes straight to settings, not back to for-business.
      router.replace('/merchant-dashboard' as any);
    } catch (e: any) {
      setError(e.message ?? t('merchant.login_error'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-5 pb-6" style={{ gap: 16, backgroundColor: '#FFFFFF' }}>
          {/* Brand header */}
          <View className="items-center" style={{ gap: 6 }}>
            <Image source={require('../../assets/logo-stamply.png')} style={{ height: 28, width: 100 }} resizeMode="contain" />
            <Text
              style={localeDirStyle}
              className="text-center text-sm text-gray-500"
            >
              {t('merchant.login_subtitle')}
            </Text>
          </View>

          {/* Email */}
          <FormInput
            label={t('merchant.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('merchant.email_placeholder') as string}
            keyboardType="email-address"
            autoCapitalize="none"
            emailMode
            fullWidth
          />

          {/* Password */}
          <FormInput
            label={t('merchant.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            fullWidth
          />

          {/* Error */}
          {error ? (
            <Text
              className="text-center text-xs"
              style={{ color: colors.state.danger }}
            >
              {error}
            </Text>
          ) : null}

          {/* Login CTA */}
          <PrimaryButton
            label={t('merchant.login_cta')}
            onPress={handleLogin}
            loading={isLoading}
            disabled={!canSubmit}
            color="#003BC0"
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
