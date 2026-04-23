<?php

namespace App\Services\Messaging\Firebase;

use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Factory;

/**
 * FirebaseClient
 * ==============
 *
 * Thin, cached wrapper around the kreait/firebase-php SDK that gives the
 * rest of the application a single entry point for obtaining a
 * ready-to-use {@see Messaging} instance (the FCM client).
 *
 * Why a wrapper and not the SDK directly?
 *   1. Credentials resolution — the service account JSON path comes from
 *      config/firebase.php (env-driven). Centralising it here means no
 *      other class has to know where the file lives.
 *   2. Memoization — building a Firebase\Factory parses the service
 *      account and sets up Google Auth; we want to do that once per
 *      request, not per notification.
 *   3. Testability — callers type-hint this class (or the Messaging
 *      contract) and tests can swap it with a fake.
 *
 * Typical usage:
 *
 *     $messaging = app(FirebaseClient::class)->messaging();
 *     $messaging->send($cloudMessage);
 *
 * This class is bound as a singleton in {@see \App\Providers\AppServiceProvider}.
 */
class FirebaseClient
{
    /**
     * Cached Messaging instance — built once, reused for every
     * dispatch in the same request / queue worker lifecycle.
     */
    private ?Messaging $messaging = null;

    /**
     * Returns a Messaging client ready to call ->send($message).
     *
     * Throws if:
     *   - Firebase is disabled via config('firebase.enabled').
     *   - The service account JSON is missing / unreadable.
     *   - The JSON is malformed (missing private_key, client_email, etc.).
     *
     * Callers should usually guard with {@see self::isEnabled()} before
     * calling this, or catch the exception and log it.
     */
    public function messaging(): Messaging
    {
        if ($this->messaging !== null) {
            return $this->messaging;
        }

        $credentialsPath = (string) config('firebase.credentials');

        if (! is_file($credentialsPath) || ! is_readable($credentialsPath)) {
            throw new \RuntimeException(
                "Firebase service account JSON not found or not readable at: {$credentialsPath}. "
                ."Download it from Firebase Console → Project Settings → Service accounts, "
                ."and place it at storage/firebase/service-account.json (or set FIREBASE_CREDENTIALS)."
            );
        }

        // Factory::withServiceAccount() accepts a file path OR an array.
        // The SDK handles token caching internally (short-lived OAuth2
        // access tokens are refreshed every ~55 minutes automatically).
        $this->messaging = (new Factory())
            ->withServiceAccount($credentialsPath)
            ->createMessaging();

        return $this->messaging;
    }

    /**
     * Whether Firebase is configured and turned on. Used by callers
     * that want to short-circuit before attempting a send — keeps
     * the "push disabled" log line quiet on local/CI environments
     * that don't have Firebase credentials checked in.
     */
    public function isEnabled(): bool
    {
        if (! (bool) config('firebase.enabled', true)) {
            return false;
        }

        $credentialsPath = (string) config('firebase.credentials');

        return is_file($credentialsPath) && is_readable($credentialsPath);
    }

    /**
     * Firebase project ID — handy for logs / metrics so you can tell
     * at a glance which environment you are hitting.
     */
    public function projectId(): string
    {
        return (string) config('firebase.project_id');
    }
}
