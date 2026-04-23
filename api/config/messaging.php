<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Email provider
    |--------------------------------------------------------------------------
    |
    | Stamply uses Resend for transactional email by default.
    | Laravel's built-in mail driver (set via MAIL_MAILER) is used for
    | delivery; these values drive the tenant-facing templates.
    */
    'email' => [
        'enabled' => env('MESSAGING_EMAIL_ENABLED', false),
        'from_address' => env('MAIL_FROM_ADDRESS', 'noreply@stamply.test'),
        'from_name' => env('MAIL_FROM_NAME', 'Stamply'),
    ],

    /*
    |--------------------------------------------------------------------------
    | SMS provider (Twilio) — tenant-level for marketing templates
    |--------------------------------------------------------------------------
    |
    | Set TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM in .env.
    | When enabled === false, the service logs messages instead of sending.
    |
    | NOTE: OTP SMS is managed at the platform level via /op/settings/otp-sms
    | and stored in platform_settings (supports SMSCountry + Twilio).
    */
    'sms' => [
        'enabled' => env('MESSAGING_SMS_ENABLED', false),
        'driver' => env('MESSAGING_SMS_DRIVER', 'twilio'),
        'twilio' => [
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from' => env('TWILIO_FROM'),
        ],
    ],
];
