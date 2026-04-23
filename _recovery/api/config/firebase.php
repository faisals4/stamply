<?php

/*
|--------------------------------------------------------------------------
| Firebase Configuration
|--------------------------------------------------------------------------
|
| Stamply uses Firebase Cloud Messaging (FCM) to deliver push notifications
| to the native iOS and Android apps. The backend (Laravel) acts as a
| trusted server and talks to FCM HTTP v1 API using a Google service
| account — this is separate from the Apple Wallet APNs pipeline
| (see config/wallet.php) which pushes silent updates to .pkpass passes.
|
| Setup checklist (one-time per environment):
|
|   1. Firebase Console → Project Settings → Service accounts
|      → "Generate new private key" → download JSON.
|
|   2. Place the JSON at storage/firebase/service-account.json (this path
|      is gitignored). You can override the path with the env var
|      FIREBASE_CREDENTIALS.
|
|   3. iOS only: Firebase Console → Project Settings → Cloud Messaging
|      → Apple app configuration → upload the APNs Auth Key (.p8) once
|      for Development AND Production. Firebase now relays APNs traffic
|      for you; you don't call APNs directly from Laravel.
|
|   4. (Optional) Android: register an Android app under the same
|      Firebase project, download google-services.json, place it at
|      mobile/google-services.json. No backend change required — the
|      same service account below serves both platforms.
|
| How it is used:
|   - App\Services\Messaging\Firebase\FirebaseClient       → SDK bootstrap
|   - App\Services\Messaging\Firebase\FcmTransport         → single-send
|   - App\Services\Messaging\PushService::dispatch()       → router
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Firebase Project ID
    |--------------------------------------------------------------------------
    |
    | Must match the `project_id` inside the service account JSON.
    | Used for logging + FCM HTTP v1 endpoint construction.
    */
    'project_id' => env('FIREBASE_PROJECT_ID', 'stamply-app-9a39c'),

    /*
    |--------------------------------------------------------------------------
    | Service Account Credentials
    |--------------------------------------------------------------------------
    |
    | Absolute path OR relative-to-storage path to the service account JSON
    | downloaded from Firebase Console. Keep this file out of git.
    |
    | The directory storage/firebase is gitignored — place the JSON there.
    */
    'credentials' => env(
        'FIREBASE_CREDENTIALS',
        storage_path('firebase/service-account.json'),
    ),

    /*
    |--------------------------------------------------------------------------
    | iOS Bundle ID (APNs topic)
    |--------------------------------------------------------------------------
    |
    | Used by FCM to route messages to the correct iOS app. Must match
    | the Bundle Identifier registered with Firebase and in Apple Developer.
    */
    'ios_bundle_id' => env('FIREBASE_IOS_BUNDLE_ID', 'cards.stamply.app'),

    /*
    |--------------------------------------------------------------------------
    | Android Package Name
    |--------------------------------------------------------------------------
    */
    'android_package' => env('FIREBASE_ANDROID_PACKAGE', 'cards.stamply.app'),

    /*
    |--------------------------------------------------------------------------
    | Global On/Off Switch
    |--------------------------------------------------------------------------
    |
    | Disable to suppress every FCM send (useful in CI / local dev
    | without Firebase credentials). When false, PushService::dispatch()
    | logs a line and returns false for iOS/Android tokens.
    */
    'enabled' => env('FIREBASE_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Multicast Batch Size
    |--------------------------------------------------------------------------
    |
    | FCM HTTP v1 accepts up to 500 tokens per multicast request. We batch
    | broadcasts into chunks of this size and send them in parallel jobs.
    */
    'multicast_batch_size' => 500,

    /*
    |--------------------------------------------------------------------------
    | Default TTL (seconds)
    |--------------------------------------------------------------------------
    |
    | How long FCM should keep trying to deliver a message if the device
    | is offline. 24h is fine for most loyalty events; broadcasts can
    | override per-request.
    */
    'default_ttl_seconds' => 60 * 60 * 24,

];
