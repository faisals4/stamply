<?php

/**
 * Custom router script for PHP's built-in server.
 *
 * Why this exists
 * ───────────────
 * The default router (`vendor/laravel/framework/src/Illuminate/Foundation/
 * resources/server.php`) used by `php artisan serve` has a long-standing
 * limitation: when a request path shares its first segment with a real
 * directory under `public/`, PHP's built-in server tries to resolve the
 * request as an asset inside that directory and returns 404 directly,
 * without ever reaching Laravel's router.
 *
 * That breaks the mobile-app SPA deployment at `/app`, because we ship
 * the exported Expo web build under `public/app/` and also need Laravel
 * to catch deep-link URLs like `/app/cards` and serve `index.html` as
 * the SPA fallback. The default router sees `public/app/cards` doesn't
 * exist and 404s before `Route::get('/app/{any?}', ...)` gets a chance.
 *
 * This script fixes the behavior with three tightened rules:
 *   1. Only serve a real FILE from disk — never a directory. That's the
 *      key difference from Laravel's default (which uses `file_exists`,
 *      which returns true for directories).
 *   2. If no file matches, forward EVERYTHING to `public/index.php` and
 *      let Laravel's router decide.
 *   3. The document root is explicitly `public/`, so relative paths are
 *      unambiguous.
 *
 * Usage
 * ─────
 *   php -S 127.0.0.1:8000 -t public server.php
 *
 * Or via the composer script:
 *   composer serve-dev
 *
 * In production this file is never executed — Nginx / Caddy / Laravel
 * Herd handle URL rewriting correctly and `public/` is the document
 * root with no special handling required.
 */

$publicPath = __DIR__.'/public';

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// Serve existing asset files directly. `is_file` (not `file_exists`)
// so directory paths never hijack the router.
if ($uri !== '/' && is_file($publicPath.$uri)) {
    return false;
}

// The critical fix: PHP's built-in server sets SCRIPT_NAME to
// `/app/index.html` when it sees `public/app/` as a directory and the
// request is a subpath that doesn't match a real asset. Laravel reads
// SCRIPT_NAME to compute the app's base path, so it would think the
// app is mounted at `/app/` and strip that prefix from the URI — which
// breaks the `Route::get('/app/{any?}', ...)` SPA fallback because the
// router sees `/cards` instead of `/app/cards`. Force it back to the
// real front controller.
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $publicPath.'/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

// Minimal request log so `php -S` output is usable during dev.
$ts = date('D M j H:i:s Y');
$addr = ($_SERVER['REMOTE_ADDR'] ?? '-').':'.($_SERVER['REMOTE_PORT'] ?? '-');
$method = $_SERVER['REQUEST_METHOD'] ?? '-';
file_put_contents('php://stdout', "[$ts] $addr [$method] $uri\n");

require_once $publicPath.'/index.php';
