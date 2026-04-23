<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds a conservative set of security response headers.
 *
 * Scope: API responses. These headers don't change any behaviour for
 * legitimate API clients (mobile app, web SPA) — they only harden the
 * browser's handling of responses against sniffing, framing and
 * protocol-downgrade attacks.
 *
 * Notes:
 *   - HSTS is emitted only in production so the local HTTP dev stack
 *     isn't forcibly upgraded to HTTPS by the browser.
 *   - No Content-Security-Policy here: an API CSP is meaningless
 *     (responses are JSON, not HTML). The frontends set their own CSP
 *     on the HTML shell.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $headers = $response->headers;

        if (! $headers->has('X-Content-Type-Options')) {
            $headers->set('X-Content-Type-Options', 'nosniff');
        }
        if (! $headers->has('X-Frame-Options')) {
            $headers->set('X-Frame-Options', 'DENY');
        }
        if (! $headers->has('Referrer-Policy')) {
            $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        }
        if (! $headers->has('Permissions-Policy')) {
            $headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        }

        if (app()->environment('production') && ! $headers->has('Strict-Transport-Security')) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
