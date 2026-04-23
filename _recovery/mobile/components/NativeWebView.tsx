import { Platform, View, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').default; } catch {}
}

type Props = {
  url: string;
  /** Optional auth token to inject */
  token?: string | null;
  /** Optional user JSON to inject */
  userJson?: string | null;
};

/**
 * Cross-platform web content viewer:
 * - Web: returns null (caller uses <iframe>)
 * - Native: react-native-webview with loading spinner
 */
export function NativeWebView({ url, token, userJson }: Props) {
  if (Platform.OS === 'web' || !WebView) return null;

  // Inject token + user into localStorage so the web admin
  // recognizes the session without a second login.
  const safeUser = userJson ? userJson.replace(/'/g, "\\'") : '';
  const injectedJS = token
    ? `
      try {
        sessionStorage.setItem('stamply.embed', '1');
        localStorage.setItem('stamply.merchant.token', '${token}');
        ${safeUser ? `localStorage.setItem('stamply.merchant.user', '${safeUser}');` : ''}
      } catch(e) {}
      true;
    `
    : `
      try { sessionStorage.setItem('stamply.embed', '1'); } catch(e) {}
      true;
    `;

  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1 }}
      injectedJavaScriptBeforeContentLoaded={injectedJS}
      startInLoadingState
      renderLoading={() => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
          <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
        </View>
      )}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
    />
  );
}
