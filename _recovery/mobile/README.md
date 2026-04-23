# Stamply Mobile — Expo Universal App

Cross-platform customer app (iOS + Android + Web) built with Expo SDK 54.
Users sign in with their phone number (OTP) and see every loyalty card they
hold across every Stamply merchant in one place.

## Stack

| Concern | Library |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 + TypeScript |
| Router | expo-router (file-based, `app/`) |
| Styling | NativeWind v4 (Tailwind for RN) |
| Data | `@tanstack/react-query` |
| Storage | `expo-secure-store` on native, `localStorage` on web (see `lib/storage.ts`) |
| i18n | `i18next` + `react-i18next` + `expo-localization` |
| Icons | `lucide-react-native` |

## Running

### Prerequisites

- Node 20+ (the repo uses Node v22 at `~/.local/node/bin`)
- Laravel API running — see `api/README.md`

### Native (iOS / Android via Expo Go)

```bash
cd mobile
# Point the app at your Mac's LAN IP so a physical phone can reach it
export EXPO_PUBLIC_API_URL="http://$(ipconfig getifaddr en0):8000/api"
npx expo start
```

Then scan the QR code with Expo Go on a physical phone. In the Laravel
root, run the API server with `--host=0.0.0.0` so it's reachable on the LAN:

```bash
cd api
php artisan serve --host=0.0.0.0 --port=8000
```

### Web (served by Laravel under `/app`)

The web build is exported as static files into `api/public/app/` and
served by Laravel. This means the customer app and the API live on the
**same origin** — no CORS, no separate deploy.

**Build the app:**

```bash
cd mobile
npx expo export --platform web --output-dir ../api/public/app
```

**Start Laravel with the custom dev router** (see next section for why):

```bash
cd api
composer serve-dev
# or manually:
# php -S 127.0.0.1:8000 -t public server.php
```

Open **<http://127.0.0.1:8000/app>** — the app boots at `/app/login`.

When exposing via ngrok, point ngrok at Laravel's port
(`ngrok http 8000`) and the customer app becomes
**<https://stamply.ngrok.app/app>**.

### Why not `php artisan serve`?

PHP's built-in server has a quirk: when a request path shares its first
segment with a real directory under the document root, it sets
`SCRIPT_NAME` to that directory's index file before invoking the router
script. Laravel reads `SCRIPT_NAME` to compute the app's base path, so
it would think the whole app is mounted at `/app/` and strip the `/app`
prefix from every request — which breaks the SPA fallback route.

`api/server.php` fixes this by forcing `SCRIPT_NAME` back to
`/index.php` before Laravel bootstraps. In production (Nginx, Caddy,
Laravel Herd) this isn't an issue because the web server sets the
variables correctly.

## Project layout

```
mobile/
├── app.json                         # baseUrl: /app for web
├── app.config  (via app.json extra) # apiUrl for native builds
├── babel.config.js                  # nativewind preset
├── metro.config.js                  # nativewind + global.css
├── tailwind.config.js               # brand tokens
├── global.css                       # @tailwind directives
├── app/                             # expo-router screens
│   ├── _layout.tsx                  # QueryClient + i18n + RTL bootstrap + auth gate
│   ├── index.tsx                    # splash → /(auth)/login or /(tabs)/cards
│   ├── (auth)/
│   │   ├── _layout.tsx              # stack nav
│   │   ├── login.tsx                # phone entry
│   │   └── verify.tsx               # 4-digit OTP
│   ├── (tabs)/
│   │   ├── _layout.tsx              # bottom tabs
│   │   ├── cards.tsx                # SectionList grouped by tenant
│   │   └── settings.tsx             # profile + language + logout
│   └── card/
│       └── [serial].tsx             # card detail + stamp grid + wallet button
├── components/
│   ├── PhoneInput.tsx               # +966 prefix + 9-digit field
│   ├── PrimaryButton.tsx
│   ├── StampGrid.tsx                # visual stamp card
│   ├── BrandHeader.tsx              # tenant logo + name
│   └── CardListItem.tsx             # list row with progress bar
├── lib/
│   ├── api.ts                       # typed fetch wrapper + ApiError + bearer
│   ├── auth.ts                      # wraps storage.ts with TOKEN/CUSTOMER keys
│   ├── storage.ts                   # SecureStore (native) / localStorage (web)
│   ├── i18n.ts                      # initI18n + getStoredLocale + setStoredLocale
│   └── queryClient.ts
└── locales/
    ├── ar.json
    └── en.json
```

## Web-specific notes

- **Storage**: `lib/storage.ts` switches on `Platform.OS` so `auth.ts`
  and `i18n.ts` work on both native (Keychain/Keystore via
  `expo-secure-store`) and web (`window.localStorage`).
- **RTL**: on native we call `I18nManager.forceRTL(true)` and request a
  JS bundle reload. On web we set `document.documentElement.dir = 'rtl'`
  live — browsers flip the layout without a reload, so the language
  toggle in Settings applies instantly.
- **API base URL**: on web we use `window.location.origin + '/api'` so
  there's no CORS. On native we read `expo.extra.apiUrl` from app.json
  (override with `EXPO_PUBLIC_API_URL` for LAN access).
- **Apple/Google Wallet buttons**: on web, clicking the button calls
  `Linking.openURL(res.data.url)` which loads the `.pkpass` URL. Safari
  on iPhone hands `.pkpass` MIME types off to Wallet automatically;
  Chrome on Android opens Google Wallet save URLs the same way. Desktop
  browsers download the file.

## Test accounts

The Laravel API ships with a dev master OTP code `0000` when
`APP_DEBUG=true`. Use any phone that exists in the `customers` table
and enter `0000` to skip SMS entirely.

## Scripts

```bash
# TypeScript check
npx tsc --noEmit

# Bundle smoke test (doesn't run the app, just verifies Metro compiles)
npx expo export --platform ios --output-dir /tmp/smoke && rm -rf /tmp/smoke

# Export fresh web build into Laravel public/
npx expo export --platform web --output-dir ../api/public/app
```
