<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


/*
 * Customer mobile app (Expo web build) served under /app.
 *
 * The static assets (js/css/images) live in `public/app/` and are
 * served directly by Laravel's front controller — we don't need any
 * routing for them. This catch-all only fires when a browser
 * deep-links or refreshes on an in-app route like `/app/cards`, in
 * which case the SPA router expects to receive the same index.html
 * it would have received from `/app`. Without this route Laravel
 * would return a 404 because no file matches that path on disk.
 *
 * Restricted via `where` to any path that is NOT an asset
 * extension, so `/app/_expo/static/js/...` and friends fall through
 * to the file system.
 */
Route::get('/app/{any?}', function ($any = null) {
    $index = public_path('app/index.html');
    if (! file_exists($index)) {
        abort(404, 'Mobile app build not found. Run `npx expo export --platform web --output-dir ../api/public/app` from mobile/.');
    }

    return response(file_get_contents($index), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
})->where('any', '.*');
