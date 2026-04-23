<?php

namespace App\Providers;

use App\Events\CardIssued;
use App\Events\StampGiven;
use App\Listeners\AutomationDispatcher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Wire automation event triggers. A single dispatcher routes both
        // events to its own internal handlers; this avoids needing the
        // legacy EventServiceProvider in Laravel 11.
        Event::listen(CardIssued::class, [AutomationDispatcher::class, 'handleCardIssued']);
        Event::listen(StampGiven::class, [AutomationDispatcher::class, 'handleStampGiven']);

        // Strict eager-loading in non-production so the
        // central-profile refactor doesn't quietly accumulate N+1
        // queries from `customer->profile` proxy reads. Any lazy
        // load on a missing relation throws LazyLoadingViolation in
        // dev/testing — safe in prod (disabled) to avoid 500s.
        Model::preventLazyLoading(! app()->isProduction());

        // Safety net: if production is ever deployed with APP_DEBUG=true,
        // Laravel will leak stack traces and env data in error responses.
        // Log once on boot so it surfaces in log aggregation / alerts.
        if (app()->isProduction() && config('app.debug')) {
            Log::critical('[security] APP_DEBUG=true in production — stack traces will leak to clients.');
        }
    }
}
