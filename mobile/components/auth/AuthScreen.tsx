import { ReactNode } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../ScreenContainer';
import { LanguageToggle } from './LanguageToggle';
import { useLocaleDirStyle } from '../../lib/useLocaleDirStyle';

type Props = {
  children: ReactNode;
  /** Optional back button rendered at the top-end corner (opposite to language toggle). */
  backButton?: ReactNode;
};

/**
 * Shared chrome for the (auth) flow — login + verify share the same
 * white safe-area wrapper, language toggle in the corner, keyboard-
 * avoiding behavior, and centered ScreenContainer with horizontal
 * padding.
 *
 * Both the language toggle and back button are inside the
 * ScreenContainer so they respect the 440px max-width on desktop.
 */
export function AuthScreen({ children, backButton }: Props) {
  const localeDirStyle = useLocaleDirStyle();
  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScreenContainer style={{ flex: 1, paddingHorizontal: 24, ...localeDirStyle }}>
          {/* Top bar: back button (inline-start) + language (inline-end)
              In RTL: back=right, lang=left. In LTR: back=left, lang=right. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 8 }}>
            {backButton ?? <View style={{ width: 36 }} />}
            <LanguageToggle />
          </View>

          {/* Content centered vertically */}
          <View style={{ flex: 1, justifyContent: 'center', ...localeDirStyle }}>
            {children}
          </View>
        </ScreenContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
