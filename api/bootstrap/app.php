<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
            'can.perm' => \App\Http\Middleware\CheckPermission::class,
            'subscription' => \App\Http\Middleware\CheckSubscription::class,
            'plan.quota' => \App\Http\Middleware\CheckPlanQuota::class,
        ]);

        // Trust every proxy in front of the app so `url()`, request
        // host resolution and the generated asset URLs use the
        // ngrok / production host that the client actually hit,
        // not the internal localhost the app server binds to.
        // Without this, URLs like the tenant-logo endpoint returned
        // to the mobile client carry the wrong host and fail to
        // load in iOS Safari (the only origin iOS knows how to
        // resolve is the one the page was served from).
        $middleware->trustProxies(
            at: '*',
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
