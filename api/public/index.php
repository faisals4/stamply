<?php

/*
 * SCRIPT_NAME correction for the Expo web build under /app.
 *
 * The customer mobile app is exported as static files into
 * `public/app/` and Laravel owns the SPA fallback route
 * `Route::get('/app/{any?}', ...)` in `routes/web.php`.
 *
 * Both nginx (Laravel Herd) and PHP's built-in server detect the
 * `public/app/` directory first and, when the request doesn't match
 * a real asset (e.g. `/app/cards`), they set CGI variables so that
 * SCRIPT_NAME=/app/index.html and PATH_INFO=/cards. Laravel reads
 * SCRIPT_NAME to compute the app's base path, decides the whole
 * application is mounted under /app/, strips that prefix from the
 * request URI, and ends up trying to match /cards instead of
 * /app/cards — which 404s because no such route exists.
 *
 * The fix: if SCRIPT_NAME was hijacked to point at the SPA index,
 * force it back to /index.php (this file) BEFORE Laravel bootstraps.
 * The real REQUEST_URI is untouched, so the router sees /app/cards
 * and the catch-all fires.
 */
if (
    isset($_SERVER['SCRIPT_NAME'])
    && str_ends_with($_SERVER['SCRIPT_NAME'], '/app/index.html')
) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = __FILE__;
    $_SERVER['PHP_SELF'] = '/index.php';
    unset($_SERVER['PATH_INFO']);
}

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
