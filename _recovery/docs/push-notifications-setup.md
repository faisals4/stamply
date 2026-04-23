# Push Notifications — FCM Setup

This document explains how Stamply delivers push notifications to the
native mobile app (iOS + Android) via **Firebase Cloud Messaging (FCM)**,
and what credentials / config are required in each environment.

> Apple Wallet `.pkpass` updates are a separate channel — see
> [`wallet-setup.md`](./wallet-setup.md). The two complement each
> other: a customer who has the card in Wallet AND uses the app sees
> the same event (e.g. "stamp added") on both surfaces.

---

## 1. Architecture

```
                                   ┌──────────────────────────┐
[stamp given]                       │  Stamply API (Laravel)    │
   in cashier UI  ─────────────────►│                           │
                                    │  CardNotificationDispatcher
                                    │   ├─ Apple Wallet update   (existing)
                                    │   └─ FCM via PushService   (new)
                                    │                           │
[/op admin]                         │  BroadcastNotifier         │
   "send broadcast" ────────────────►│   └─ FCM via PushService   │
                                    └────────────┬──────────────┘
                                                 │
                                                 ▼
                                ┌──────────────────────────────┐
                                │  Firebase Cloud Messaging    │
                                │  (kreait/firebase-php SDK)   │
                                └────────────┬─────────────────┘
                                             │
                       ┌─────────────────────┼──────────────────────┐
                       ▼                     ▼                      ▼
                 ┌─────────┐         ┌─────────────┐        ┌─────────────┐
                 │  APNs   │         │   Android    │        │   web push  │
                 │ (Apple) │         │   (FCM)      │        │   (VAPID)   │
                 └────┬────┘         └──────┬───────┘        └──────┬──────┘
                      │                     │                       │
                      ▼                     ▼                       ▼
                  iPhone app           Android app             PWA / browser
              (RN-Firebase)        (RN-Firebase)         (lib/wallet/webPush.ts)
```

Web push still uses VAPID (existing flow) — only iOS and Android
travel through Firebase.

---

## 2. Backend (Laravel)

### Files

- `config/firebase.php` — project id, credentials path, batch size.
- `app/Services/Messaging/Firebase/FirebaseClient.php` — singleton
  wrapper that bootstraps the `kreait/firebase-php` SDK.
- `app/Services/Messaging/Firebase/FcmTransport.php` — single-token
  send. Handles APNs image options + `NotFound` cleanup.
- `app/Services/Messaging/PushService.php` — router. Web → Web Push,
  iOS/Android → `FcmTransport`.
- `app/Services/Notifications/BroadcastNotifier.php` — fan-out for
  /op platform/tenant/customer broadcasts.
- `app/Services/Notifications/CardNotificationDispatcher.php` — adds
  FCM dispatch alongside the existing Wallet update.
- `app/Http/Controllers/Api/App/CustomerDevicesController.php` —
  mobile registers / unregisters its FCM token here.
- `app/Http/Controllers/Api/Op/NotificationsController.php` —
  /op endpoints: stats, history, send broadcast, detail.
- `app/Models/SentNotification.php` + `SentNotificationRecipient.php`
  — audit log for every send.

### Composer dependency

```bash
composer require kreait/firebase-php
```
(Already added to `composer.json`; run `composer install` on every
deploy.)

### Service account JSON

Download from **Firebase Console → Project Settings → Service accounts
→ Generate new private key**, then place it at:

```
api/storage/firebase/service-account.json
```

The directory is gitignored. Override the path with `FIREBASE_CREDENTIALS`
in `.env` if you keep credentials elsewhere.

### Env vars

```
FIREBASE_PROJECT_ID=stamply-app-9a39c
FIREBASE_CREDENTIALS=storage/firebase/service-account.json    # optional
FIREBASE_IOS_BUNDLE_ID=cards.stamply.app
FIREBASE_ANDROID_PACKAGE=cards.stamply.app
FIREBASE_ENABLED=true                                         # set false to silence sends in CI
```

### Migrations

```bash
php artisan migrate
```

Adds:

- `sent_notifications`
- `sent_notification_recipients`
- `customer_profile_id` column on `push_tokens`

### Routes

```
POST   /api/app/devices                 register FCM token
DELETE /api/app/devices                 unregister on logout

GET    /api/op/notifications            history (paginated)
GET    /api/op/notifications/stats      audience counters
POST   /api/op/notifications/broadcast  fire a broadcast
GET    /api/op/notifications/{id}       detail + recipients
```

---

## 3. Mobile (Expo / React Native)

### Files

- `mobile/lib/push.ts` — public API: `initPushNotifications()`,
  `registerPushToken()`, `unregisterPushToken()`. Wraps
  `@react-native-firebase/messaging`.
- `mobile/lib/api.ts` — adds `registerDevice()` / `unregisterDevice()`
  helpers calling `/api/app/devices`.
- `mobile/app/_layout.tsx` — calls `initPushNotifications()` once on
  cold start.
- `mobile/app/(auth)/verify.tsx` — calls `registerPushToken()` after
  successful OTP verify (so the token is bound to the new account).
- `mobile/app/(tabs)/settings.tsx` — calls `unregisterPushToken()`
  during logout.

### Packages

```bash
cd mobile
npx expo install @react-native-firebase/app @react-native-firebase/messaging
npx expo install expo-build-properties
```

(Already in `mobile/package.json`; run `npm install` after pulling.)

### `app.json`

The required additions (already applied):

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "cards.stamply.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "cards.stamply.app",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      [
        "expo-build-properties",
        { "ios": { "useFrameworks": "static" } }
      ]
    ]
  }
}
```

`useFrameworks: static` is required on iOS for the Firebase SDK to link
correctly under CocoaPods.

### Config files

- `mobile/GoogleService-Info.plist` — iOS Firebase config (download
  from Firebase Console → iOS app).
- `mobile/google-services.json` — Android Firebase config (download
  from Firebase Console → Android app). Add an Android app under the
  same Firebase project before enabling Android delivery.

### Building

FCM does **not** work in Expo Go — you must use a development build
or EAS build:

```bash
# local dev build
cd mobile
npx expo prebuild
npx expo run:ios       # opens Xcode-built app on simulator/device
```

For TestFlight / production:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Testing on device

1. Install the dev build on a real iPhone (FCM does not deliver to
   the iOS Simulator).
2. Open the app, log in with phone + OTP.
3. Accept the notification permission prompt.
4. Check the backend logs for `[push]` lines confirming token
   registration.
5. From `/op/notifications`, send a platform broadcast — the device
   should receive the push within seconds.

---

## 4. Operator (`/op`) console

Access at **`/op/notifications`** (super-admin only).

- Top-right **Send notification** button → composer dialog.
  - Scope = platform (every token), tenant (one merchant's
    customers), or customer (one user).
  - Title, body, optional image URL, optional deep link.
- Main table = audit history of every push (broadcast + automatic).
  - Click any row for the recipient drawer (delivery status, error
    reasons, platform breakdown).
- Filters: type, free-text search.

The Send dialog displays the live audience size (`platform_tokens`
from `/api/op/notifications/stats`) so the admin sees impact before
firing.

---

## 5. Adding a new event-driven notification

The simplest path for a new auto-trigger (e.g. "expires_soon"):

1. Add the trigger key + locale messages to the Card Template
   notifications config UI (already supports arbitrary keys via
   `card_template.notifications`).
2. In the cashier flow that mutates the card state, call
   `app(CardNotificationDispatcher::class)->fire($card, 'expires_soon')`.
3. `CardNotificationDispatcher` will:
   - Render variables (`{{customer.first_name}}`, …) using the
     existing template engine.
   - Update the Wallet pass announcement (existing channel).
   - Fan out an FCM push to every token belonging to the customer
     (new channel).
   - Write a row to `sent_notifications` so /op shows it in the
     history.

No changes to FCM or transport code needed.

---

## 6. Troubleshooting

| Symptom                                        | Likely cause                                                |
|------------------------------------------------|-------------------------------------------------------------|
| `FirebaseClient: service account not found`    | `storage/firebase/service-account.json` missing or env path wrong |
| `[fcm] disabled` in logs                       | `FIREBASE_ENABLED=false` or credentials file unreadable     |
| iOS push never arrives                         | APNs key not uploaded to Firebase, OR app bundle id ≠ `cards.stamply.app` |
| `[fcm] token not found — deleting`             | Normal — device uninstalled or backed up to a new phone     |
| `[push] token registration failed`             | Mobile API call to `/api/app/devices` failing (auth?)       |
| Notification arrives but tap does nothing      | `data.card_serial` / `data.url` not set; check `lib/push.ts` `handleDeepLink` |

