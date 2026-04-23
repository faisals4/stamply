import { NativeModules, Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';
import { getToken } from './auth';

/**
 * mobile/lib/push
 * ===============
 *
 * Thin wrapper around @react-native-firebase/messaging that the rest
 * of the Stamply mobile app uses to:
 *
 *   1. Ask the user for notification permission (iOS only — Android
 *      33+ also prompts but messaging() handles it for us).
 *   2. Retrieve this device's FCM token.
 *   3. POST the token to /api/app/devices so the backend can target it.
 *   4. Wire up foreground, background and cold-start notification
 *      handlers that deep-link into the correct screen.
 *
 * Call sites:
 *   - app/_layout.tsx  → initPushNotifications() on cold start
 *   - auth/login flow  → registerPushToken() after successful sign-in
 *                        (getting a token before login gives us a row
 *                        with no customer_profile_id — we refresh
 *                        after login to bind it to the account).
 *   - auth/logout flow → unregisterPushToken() to stop future sends.
 *
 * Web is a no-op: the PWA uses the existing VAPID Web Push flow in
 * web/src/lib/wallet/webPush.ts.
 *
 * Expo Go safety:
 *   The native module @react-native-firebase/messaging IS NOT INCLUDED
 *   in Expo Go. Importing it eagerly at the top of this file would
 *   throw "Native module RNFBAppModule not found" the moment _layout.tsx
 *   loads us — crashing the entire app. To keep dev-in-Expo-Go working
 *   we lazily require() the module behind a try/catch the first time
 *   we actually need it. When the module is missing, every public
 *   function below silently no-ops.
 */

// -----------------------------------------------------------------
// Lazy require of the native module
// -----------------------------------------------------------------

type Messaging = any; // intentionally loose — keeps Expo Go happy
type RemoteMessage = any;

let cachedMessaging: Messaging | null = null;
let nativeUnavailable = false;

/**
 * Returns the messaging() instance, or `null` when the native module
 * is missing (Expo Go, web, partial dev builds). Cached on first
 * successful call.
 */
function getMessaging(): Messaging | null {
  if (nativeUnavailable) return null;
  if (cachedMessaging) return cachedMessaging;

  // Web has no native module by definition.
  if (Platform.OS === 'web') {
    nativeUnavailable = true;
    return null;
  }

  // Expo Go does not bundle @react-native-firebase native modules.
  // The most reliable detection across SDK versions is to check the
  // bridge directly: when the RNFBApp module is registered, FCM is
  // available; otherwise it isn't (regardless of how Expo classifies
  // the runtime — `Constants.appOwnership` was deprecated in SDK 49).
  if (!NativeModules.RNFBAppModule) {
    if (__DEV__) {
      console.warn(
        '[push] RNFBAppModule not found — push notifications disabled. ' +
          'This is expected in Expo Go. To enable FCM, build a dev client: ' +
          '`npx expo prebuild --clean && npx expo run:ios`.',
      );
    }
    nativeUnavailable = true;
    return null;
  }

  try {
    // Dynamic require so any residual error stays inside the try
    // instead of crashing the JS parse step at the top of this file.
    const messagingModule =
      require('@react-native-firebase/messaging').default;
    cachedMessaging = messagingModule();
    return cachedMessaging;
  } catch (e) {
    nativeUnavailable = true;
    if (__DEV__) {
      console.warn(
        '[push] @react-native-firebase/messaging failed to initialise. ' +
          'Push notifications disabled for this session.',
        e,
      );
    }
    return null;
  }
}

/**
 * Same lazy-require pattern for the AuthorizationStatus enum which is
 * a static property on the messaging module.
 */
function getAuthStatusEnum(): any {
  if (nativeUnavailable) return null;
  try {
    return require('@react-native-firebase/messaging').default
      .AuthorizationStatus;
  } catch {
    return null;
  }
}

/** True once bindListeners() has run; protects against double-init. */
let listenersBound = false;

/**
 * Last FCM token we successfully posted to /api/app/devices. Kept in
 * module scope (not AsyncStorage) since we only need it to unregister
 * the previous token on a refresh inside the same process — which is
 * exactly when `onTokenRefresh` fires. Lost on app restart, which is
 * fine: the backend's last_seen_at cleanup job prunes stale rows.
 */
let lastRegisteredToken: string | null = null;

// -----------------------------------------------------------------
// Public API
// -----------------------------------------------------------------

/**
 * Call once on app start (from app/_layout.tsx).
 *
 * Order:
 *   1. Request permission (safe to call repeatedly — returns fast if
 *      the user already decided).
 *   2. If permission granted, fetch the FCM token and register it.
 *   3. Bind the foreground / tap / cold-start listeners (only once
 *      per process; listenersBound guard protects against double-
 *      initialisation from Fast Refresh).
 *
 * Silently no-ops on web and on platforms where messaging() throws
 * (e.g. running in Expo Go without the native module).
 */
export async function initPushNotifications(): Promise<void> {
  const messaging = getMessaging();
  if (!messaging) return;

  try {
    const allowed = await requestPermission();
    if (allowed) {
      await registerPushToken();
    }
    bindListeners();
  } catch (e) {
    console.warn('[push] init failed:', e);
  }
}

/**
 * Check the CURRENT notification permission state without prompting.
 * Returns:
 *   'granted'    — user previously authorised (incl. provisional)
 *   'denied'     — user previously denied
 *   'undetermined' — never asked; calling requestPermission() will prompt
 *   'unsupported' — Expo Go / web — cannot ask, treat as denied for UX
 *
 * Used by the login flow to decide whether to show the "enable
 * notifications" pre-prompt screen or skip straight to the home tab.
 */
export async function getPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unsupported'
> {
  const messaging = getMessaging();
  if (!messaging) return 'unsupported';

  const AuthStatus = getAuthStatusEnum();
  if (!AuthStatus) return 'unsupported';

  // hasPermission() returns the same enum values as requestPermission()
  // but without showing a system dialog — ideal for "should we show
  // our own primer first?" decisions.
  const status = await messaging.hasPermission();

  if (
    status === AuthStatus.AUTHORIZED ||
    status === AuthStatus.PROVISIONAL
  ) {
    return 'granted';
  }
  if (status === AuthStatus.DENIED) return 'denied';
  // NOT_DETERMINED — never asked yet
  return 'undetermined';
}

/**
 * Request iOS notification permission, resolve to true if granted.
 * On Android 13+ the system prompts the first time we call
 * getToken(); earlier versions grant implicitly.
 */
export async function requestPermission(): Promise<boolean> {
  const messaging = getMessaging();
  if (!messaging) return false;

  const status = await messaging.requestPermission();
  const AuthStatus = getAuthStatusEnum();
  if (!AuthStatus) return false;

  // AUTHORIZED or PROVISIONAL both count as "will deliver". PROVISIONAL
  // means quiet delivery only — iOS shows them silently in the
  // Notification Center.
  return (
    status === AuthStatus.AUTHORIZED || status === AuthStatus.PROVISIONAL
  );
}

/**
 * Grab the current FCM token for this device and POST it to
 * /api/app/devices. Idempotent — repeated calls update last_seen_at
 * on the existing row.
 *
 * Only posts when the user is logged in (we need the sanctum token
 * for the authenticated endpoint). If they're not logged in yet,
 * we exit quietly — login flow is expected to call this again after
 * successful authentication.
 */
export async function registerPushToken(): Promise<string | null> {
  const messaging = getMessaging();
  if (!messaging) return null;

  const authToken = await getToken();
  if (!authToken) return null;

  const fcmToken = await messaging.getToken();
  if (!fcmToken) return null;

  try {
    await api.registerDevice({
      token: fcmToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_info: {
        os: Platform.OS,
        os_version: Platform.Version,
      },
    });
    lastRegisteredToken = fcmToken;
  } catch (e) {
    console.warn('[push] token registration failed:', e);
  }

  return fcmToken;
}

/**
 * Called on logout. Removes the token from the backend so the user
 * stops receiving notifications meant for the previous account, and
 * deletes it locally so FCM won't deliver stale messages to the
 * freshly logged-out UI.
 */
export async function unregisterPushToken(): Promise<void> {
  const messaging = getMessaging();
  if (!messaging) return;

  try {
    const fcmToken = await messaging.getToken();
    if (fcmToken) {
      try {
        await api.unregisterDevice(fcmToken);
      } catch {
        /* best-effort — may already be gone on the server */
      }
    }
    await messaging.deleteToken();
    lastRegisteredToken = null;
  } catch (e) {
    console.warn('[push] unregister failed:', e);
  }
}

// -----------------------------------------------------------------
// Listeners — foreground, background, cold start
// -----------------------------------------------------------------

function bindListeners(): void {
  if (listenersBound) return;
  const messaging = getMessaging();
  if (!messaging) return;
  listenersBound = true;

  // 1. Token refresh — re-register whenever FCM rotates the token.
  //    We also explicitly unregister the previous token first so stale
  //    rows don't linger on the backend (and can't be used by whoever
  //    intercepts them to receive this user's future notifications).
  messaging.onTokenRefresh(async (newToken: string) => {
    const authToken = await getToken();
    if (!authToken) return;
    if (lastRegisteredToken && lastRegisteredToken !== newToken) {
      try {
        await api.unregisterDevice(lastRegisteredToken);
      } catch {
        /* best-effort — backend may already have pruned the row */
      }
    }
    try {
      await api.registerDevice({
        token: newToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      lastRegisteredToken = newToken;
    } catch (e) {
      console.warn('[push] token refresh failed:', e);
    }
  });

  // 2. Foreground messages — OS does NOT show a banner while the app
  //    is open; we could surface our own toast here. For now we let
  //    the parent screens' React Query refetches pick up the state.
  messaging.onMessage(async (remoteMessage: RemoteMessage) => {
    handleInApp(remoteMessage);
  });

  // 3. Background / quit tap — user tapped a notification and brought
  //    the app to the foreground.
  messaging.onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
    handleDeepLink(remoteMessage);
  });

  // 4. Cold-start tap — user tapped a notification while the app was
  //    killed; the message is delivered through getInitialNotification.
  messaging
    .getInitialNotification()
    .then((remoteMessage: RemoteMessage | null) => {
      if (remoteMessage) {
        // Slight delay so expo-router has mounted before navigation.
        setTimeout(() => handleDeepLink(remoteMessage), 400);
      }
    });
}

function handleInApp(remoteMessage: RemoteMessage): void {
  if (__DEV__) {
    console.log('[push] foreground message', {
      title: remoteMessage?.notification?.title,
      data: remoteMessage?.data,
    });
  }
}

/**
 * Read the `data` payload the backend attached to the FCM message
 * and route to the most appropriate screen:
 *
 *   - card_serial  → open the card detail screen
 *   - url          → open the URL (external http / app scheme)
 *   - (fallback)   → navigate home
 */
function handleDeepLink(remoteMessage: RemoteMessage): void {
  const data = remoteMessage?.data ?? {};
  const cardSerial = typeof data.card_serial === 'string' ? data.card_serial : null;
  const url = typeof data.url === 'string' ? data.url : null;

  if (cardSerial) {
    router.push(`/card/${encodeURIComponent(cardSerial)}`);
    return;
  }
  if (url && url.startsWith('stamply://')) {
    router.push(url.replace('stamply://', '/'));
    return;
  }
  if (url && url.startsWith('http')) {
    import('react-native').then(({ Linking }) => {
      Linking.openURL(url).catch(() => {
        /* noop */
      });
    });
    return;
  }
  router.push('/');
}
