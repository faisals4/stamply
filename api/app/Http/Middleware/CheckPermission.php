<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware that blocks requests whose authenticated user lacks the
 * required tenant permission. Usage:
 *
 *     Route::get('cards', ...)->middleware('can:cards.view');
 *
 * Admins always bypass (see User::hasPermission). Unauthenticated requests
 * fall through to the normal auth middleware.
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        if (!$user->hasPermission($permission)) {
            abort(403, 'ليس لديك صلاحية لإجراء هذه العملية');
        }

        return $next($request);
    }
}
