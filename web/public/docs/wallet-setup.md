# Wallet Setup — Apple + Google

Stamply supports three ways for customers to install their loyalty card:

| Provider | Status | Requires |
|---|---|---|
| PWA (web) | ✅ Always on | Nothing |
| Apple Wallet | ⏳ Scaffolded | Apple Developer account ($99/yr) + Pass Type ID cert |
| Google Wallet | ⏳ Scaffolded | Google Cloud project + Wallet API + service account |

Everything is already wired in code. You only need to add the credentials below
and set `WALLET_APPLE_ENABLED=true` / `WALLET_GOOGLE_ENABLED=true` in `api/.env`.

## Apple Wallet (PassKit)

### 1. Apple Developer account
- Sign up at https://developer.apple.com/programs/ ($99/year)
- Identity verification takes 1-2 weeks. Start early.

### 2. Create a Pass Type ID
- https://developer.apple.com/account/resources/identifiers/list/passTypeId
- Click `+` → Pass Type IDs → enter a reverse-DNS identifier like `pass.cards.stamply`
- Save it.

### 3. Download the certificate
- In the same identifier, click "Create Certificate"
- Upload a CSR from Keychain Access: Certificate Assistant → Request from CA
- Download the `.cer` file
- Double-click to import into Keychain
- In Keychain Access, right-click the certificate → Export → save as `.p12` with a password
- Place the file at `api/storage/certificates/apple-pass.p12`

### 4. Download the WWDR intermediate
- https://www.apple.com/certificateauthority/ → download "Apple Worldwide Developer Relations G4"
- Convert from .cer to .pem:

  ```bash
  openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
  ```
- Place at `api/storage/certificates/wwdr.pem`

### 5. Install the PHP PassKit library

```bash
cd api
composer require chrisdpa/passkit-generator
```

Then complete `api/app/Services/Wallet/Apple/ApplePassBuilder::signPkPass()` —
there's a pseudo-code example in the method body.

### 6. Configure env

```env
# api/.env
WALLET_APPLE_ENABLED=true
APPLE_PASS_TYPE_ID=pass.cards.stamply
APPLE_TEAM_ID=XXXXXXXXXX         # top-right of developer.apple.com/account
APPLE_ORG_NAME=Stamply
APPLE_CERT_PATH=storage/certificates/apple-pass.p12
APPLE_CERT_PASSWORD=your_p12_password
APPLE_WWDR_PATH=storage/certificates/wwdr.pem
```

### 7. Test
- Visit `/i/:serial` on a real iPhone
- Click "إضافة إلى Apple Wallet" → the pass should be downloaded and installed.

## Google Wallet

### 1. Create a Google Cloud project
- https://console.cloud.google.com/projectcreate

### 2. Enable the Google Wallet API
- APIs & Services → Library → search "Google Wallet API" → Enable

### 3. Get an Issuer ID
- https://pay.google.com/business/console/ → onboard as a brand → note the Issuer ID (a long number)

### 4. Create a service account
- IAM & Admin → Service Accounts → Create
- Grant role: "Wallet Object Issuer"
- Keys → Create Key → JSON → download
- Place at `api/storage/certificates/google-service-account.json`

### 5. Install the Google API client

```bash
cd api
composer require google/apiclient google/apiclient-services firebase/php-jwt
```

Then complete `api/app/Services/Wallet/Google/GooglePassBuilder::buildSaveUrl()`
— pseudo-code is in the method body.

### 6. Configure env

```env
# api/.env
WALLET_GOOGLE_ENABLED=true
GOOGLE_WALLET_ISSUER_ID=3388000000000000000
GOOGLE_WALLET_SA_PATH=storage/certificates/google-service-account.json
```

### 7. Test
- Visit `/i/:serial` on an Android device
- Click "إضافة إلى Google Wallet" → should redirect to Google's save flow.

## Storage paths note

Both cert files should NEVER be committed to git. `.gitignore` already excludes
`api/storage/certificates/`. When deploying to production, upload them through
your host's secret-files mechanism (e.g. Laravel Cloud, Forge).

## Push updates

Once a customer has installed a pass:

- **Apple:** iOS automatically re-fetches when we push via APNs. The
  `apple_pass_registrations` table stores device push tokens, and
  `ApplePassBuilder` builds the update pass. We still need to add:
  - An APNs sender job
  - The PassKit web service endpoints (v1/devices/.../registrations/...) —
    these are scaffolded as routes but not implemented yet.

- **Google:** Google re-fetches automatically when the `LoyaltyObject` is
  updated via the API. Simply call `GooglePassBuilder->updateLoyaltyObject()`
  whenever `stamps_count` changes — we'll wire this to the `StampGiven` event
  once the library is installed.

## Fallback

When neither wallet is configured, the web PWA card view (`/i/:serial`) still
works as-is — it's a bookmarkable web page with a QR code. The "Add to Wallet"
buttons simply don't appear when `WALLET_*_ENABLED` is false.
