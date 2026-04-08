# Stamply Mobile App — Plan

## 🎯 Vision

Unified native mobile app (iOS + Android) where each customer signs
in with their **phone number** and sees **all their loyalty cards
across every merchant** in one place. Solves the "one app per
merchant" fatigue and unlocks features Apple Wallet's pass updates
can't provide (native push with sound, unified inbox, QR scan to
register, personalised offers, analytics).

## 💎 Why a native app in addition to Apple/Google Wallet

| Problem | Wallet Pass | Native App |
|---|---|---|
| Notifications with **sound** | ❌ Background pushes only | ✅ Standard APNs/FCM alert pushes |
| **Custom notification text/title** | ⚠️ Via `changeMessage` (unreliable on back fields) | ✅ Full control |
| **Unified view** of 13 cards | ❌ Each pass is separate | ✅ Single grouped list |
| **Scan QR** to add a new card | ❌ Need Safari | ✅ Native camera |
| **Push notifications reliability** | ⚠️ Depends on "Automatic Updates" toggle | ✅ Standard iOS notifications |
| **Offline view** of collected stamps | ⚠️ Pass view only | ✅ Full history cache |
| **Referrals / sharing** | ⚠️ Manual | ✅ Share sheet / deep links |

**Strategy**: offer both. Wallet pass stays as the "quick & static"
channel; the app is the "engagement & analytics" channel. Customers
pick what suits them; most loyalty-heavy users will prefer the app.

## 🏗 Architecture

### Cross-tenant customer model

The existing `customers` table is unique per `(tenant_id, phone)` —
meaning the same real person has N customer rows across N merchants.
The app flattens this back: on login by phone, we fetch **every**
customer row with that phone, then aggregate all their `issued_cards`.

```
one real person (phone: +9665…)
    └── customer@tenant_1  (cafe A)
    │        └── issued_card #12
    ├── customer@tenant_2  (gym B)
    │        └── issued_card #33
    └── customer@tenant_3  (salon C)
             └── issued_card #91
```

No migration needed — the data model already supports this.

### New API surface: `/api/app/*`

Separate from `/api/*` (tenant admin) and `/api/public/*` (unauthenticated
signup page). Customer-authenticated, cross-tenant:

| Endpoint | Description |
|---|---|
| `POST /api/app/auth/otp/request` | Send OTP to phone (rate-limited 3/hour) |
| `POST /api/app/auth/otp/verify` | Verify OTP → issue Sanctum bearer (ability: `customer`) |
| `GET /api/app/me` | Profile (name, phone, email, locale) |
| `PUT /api/app/me` | Update profile (name, email, locale) |
| `GET /api/app/cards` | All cards for this phone, grouped by brand |
| `GET /api/app/cards/{serial}` | Card detail + stamps history + rewards |
| `POST /api/app/cards/{serial}/wallet/apple` | Return signed .pkpass URL |
| `POST /api/app/cards/{serial}/wallet/google` | Return Google Wallet save URL |
| `POST /api/app/devices` | Register APNs/FCM device token |
| `DELETE /api/app/devices/{id}` | Unregister on logout |
| `GET /api/app/notifications` | Inbox of received notifications |
| `POST /api/app/scan/{public_slug}` | Scan a card template QR → issue card |

### Sanctum guard

New ability `customer` on the Sanctum token. Different from `admin`
and `op`. The controller middleware checks the ability and loads
the authenticated customer rows via phone.

## 📱 Mobile Stack

- **Framework**: Expo SDK 51+ (managed workflow)
- **Language**: TypeScript
- **Router**: Expo Router (file-based, similar to Next.js)
- **State / API**: `@tanstack/react-query` (same as web)
- **UI**: NativeWind (Tailwind for RN) — reuse design tokens from web
- **Icons**: `lucide-react-native`
- **Auth storage**: `expo-secure-store`
- **Push**: `expo-notifications` → APNs (iOS) + FCM (Android)
- **Camera/QR**: `expo-camera` + `expo-barcode-scanner`
- **Apple Wallet**: community plugin or custom config plugin
- **Google Wallet**: `react-native-google-wallet`
- **Localization**: `expo-localization` + `i18next` (ar / en)
- **Build**: EAS Build
- **Deploy**: EAS Submit → App Store + Play Store
- **OTA updates**: EAS Update (fix bugs without review)
- **Crash reporting**: Sentry

## 🗺 Phase Plan

### Phase 1 — MVP (1-2 weeks)

**Backend:**
- [ ] Migration: `customer_otps` table (OR cache-based storage)
- [ ] `CustomerAuthController`: request + verify OTP → Sanctum token
- [ ] `CustomerProfileController`: me + update
- [ ] `CustomerCardsController`: list + detail (cross-tenant by phone)
- [ ] Rate-limit OTP (3/hour per phone, 5 attempts per code)
- [ ] Hook SMS via existing `SmsService` or direct Twilio/Unifonic

**Mobile:**
- [ ] Expo project + TypeScript + NativeWind + dark mode + RTL
- [ ] Phone OTP login screen
- [ ] Cards list screen (grouped by brand)
- [ ] Card detail screen (stamps visual + rewards + history)
- [ ] "Add to Apple Wallet" + "Add to Google Wallet" buttons
- [ ] Settings (language, logout)

### Phase 2 — Notifications (1 week)

- [ ] `expo-notifications` integration + token registration
- [ ] Backend: route lifecycle triggers to native APNs/FCM when user has
      the app installed (fall back to wallet pass updates otherwise)
- [ ] Notifications inbox screen
- [ ] Badge counts

### Phase 3 — Engagement (1 week)

- [ ] QR scanner to register for new cards on the spot
- [ ] Nearby merchants (geolocation + map)
- [ ] Share card with friends (deep links)
- [ ] Referral codes

### Phase 4 — Optional

- [ ] Biometric login (Face ID / Touch ID)
- [ ] Apple Sign-in / Google Sign-in as alternative to OTP
- [ ] Customer insights / stats
- [ ] Gamification (streaks, achievements)

## 💰 Cost

| Item | Annual |
|---|---|
| Apple Developer Program | $99 |
| Google Play Console (one-off) | $25 |
| EAS (free tier covers <30 builds/month) | $0 |
| SMS for OTP (~1000/month via Unifonic) | ~$10/month |
| **Total first-year estimate** | **~$150** |

## 🔐 Security Notes

- OTP codes are 6 digits, stored hashed in cache, TTL 5 minutes.
- Max 5 verify attempts per code → invalidated.
- Max 3 requests per phone per hour.
- Phone verification token (post-verify) is short-lived (15 minutes)
  and single-use.
- Native push tokens are per-device; logout removes them server-side.
- Sanctum token ability `customer` cannot call any `/api/*` admin
  endpoint — enforced by middleware.

## 📂 Repository Structure

Recommended monorepo:

```
Stamply/
├── api/          (Laravel backend)
├── web/          (tenant dashboard + public signup, existing)
├── mobile/       (new — Expo app)
│   ├── app/      (Expo Router file-based screens)
│   ├── components/
│   ├── lib/      (API client, auth, shared hooks)
│   └── app.json  (Expo config)
└── docs/
    └── mobile-app-plan.md  (this file)
```

## 🚀 First Iteration Tasks

When implementation starts:

1. Scaffold Expo project in `Stamply/mobile/`
2. Backend: OTP flow (reused by the public signup page — see the
   "Identity verification" security fix below)
3. Mobile: phone OTP login screen
4. Backend: `/api/app/cards` endpoint
5. Mobile: cards list + detail screen
6. Mobile: Apple Wallet add button
7. Beta on TestFlight + Play Internal
8. Iterate on feedback

## 🔗 Synergy with the "phone verification on signup" security fix

The same OTP infrastructure used by the mobile app is also needed to
fix a security hole in the existing public card signup flow at
`/c/{template}`: today any visitor can type any phone number and
register a card under someone else's name, which both spams innocent
users and poisons the merchant's customer data.

Building the OTP service once serves both use cases — it's why the
security fix is being implemented immediately while this mobile plan
stays as the next major feature after that lands.
