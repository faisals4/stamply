<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Apple Wallet (PassKit)
    |--------------------------------------------------------------------------
    |
    | Issued through https://developer.apple.com — requires an Apple Developer
    | account ($99/year) and a Pass Type ID certificate.
    |
    | See docs/wallet-setup.md for full instructions.
    */
    'apple' => [
        'enabled' => env('WALLET_APPLE_ENABLED', false),
        'pass_type_id' => env('APPLE_PASS_TYPE_ID', 'pass.cards.stamply.dev'),
        'team_id' => env('APPLE_TEAM_ID'),
        'organization_name' => env('APPLE_ORG_NAME', 'Stamply'),
        // Absolute path or storage_path('certificates/apple-pass.p12')
        'certificate_path' => env('APPLE_CERT_PATH', storage_path('certificates/apple-pass.p12')),
        'certificate_password' => env('APPLE_CERT_PASSWORD'),
        // Intermediate cert downloaded from Apple
        'wwdr_path' => env('APPLE_WWDR_PATH', storage_path('certificates/wwdr.pem')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Wallet
    |--------------------------------------------------------------------------
    |
    | Issued through https://pay.google.com/business — create a Google Cloud
    | project, enable the Wallet API, create a service account and download
    | its JSON credentials.
    */
    'google' => [
        'enabled' => env('WALLET_GOOGLE_ENABLED', false),
        'issuer_id' => env('GOOGLE_WALLET_ISSUER_ID'),
        'service_account_path' => env(
            'GOOGLE_WALLET_SA_PATH',
            storage_path('certificates/google-service-account.json'),
        ),
    ],
];
