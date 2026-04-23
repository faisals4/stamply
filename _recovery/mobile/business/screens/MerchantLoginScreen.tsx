import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';
import { colors } from '../../lib/colors';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { useMerchantAuth } from '../lib/merchant-auth';

/**
 * Merchant login screen — slides down from the top as a modal
 * (presentation: 'modal' in the Stack.Screen options). Two fields:
 * email + password, matching the web admin login at `/admin/login`.
 *
 * On success → navigates to `/merchant-dashboard`.
 * On error → shows inline error message.
 */
export function MerchantLoginScreen() {
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
      router.replace('/merchant-dashboard' as any);
    } catch (e: any) {
      setError(e.message ?? t('merchant.login_error'));
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      <ScreenContainer>
        <HeaderBar
          title={t('merchant.login_title')}
          onBack={() => router.back()}
        />

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 justify-center px-5" style={{ gap: 16 }}>
            {/* Logo / brand */}
            <View className="items-center" style={{ gap: 8 }}>
              <Text className="text-2xl font-bold" style={{ color: colors.brand.DEFAULT }}>
                Stamply
              </Text>
              <Text
                style={localeDirStyle}
                className="text-center text-sm text-gray-500"
              >
                {t('merchant.login_subtitle')}
              </Text>
            </View>

            {/* Email field */}
            <View style={{ gap: 6 }}>
              <Text style={localeDirStyle} className="text-start text-sm text-gray-700">
                {t('merchant.email')}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('merchant.email_placeholder') as string}
                placeholderTextColor={colors.ink.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[
                  localeDirStyle,
                  {
                    height: 48,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.ink.divider,
                    backgroundColor: colors.white,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: colors.ink.primary,
                    minWidth: 0,
                  },
                  { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            {/* Password field */}
            <View style={{ gap: 6 }}>
              <Text style={localeDirStyle} className="text-start text-sm text-gray-700">
                {t('merchant.password')}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.ink.tertiary}
                secureTextEntry
                autoComplete="password"
                style={[
                  {
                    height: 48,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.ink.divider,
                    backgroundColor: colors.white,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: colors.ink.primary,
                    minWidth: 0,
                  },
                  { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            {/* Error */}
            {error ? (
              <Text className="text-center text-xs" style={{ color: colors.state.danger }}>
                {error}
              </Text>
            ) : null}

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit || isLoading}
              className="items-center justify-center rounded-2xl"
              style={{
                height: 48,
                backgroundColor: colors.brand.DEFAULT,
                opacity: canSubmit && !isLoading ? 1 : 0.4,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text className="text-sm text-white">
                  {t('merchant.login_cta')}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
