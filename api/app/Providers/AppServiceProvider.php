<?php

namespace App\Providers;

use App\Events\CardIssued;
use App\Events\StampGiven;
use App\Listeners\AutomationDispatcher;
use Illuminate\Support\Facades\Event;
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
    }
}
