<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Grant birthday stamps every morning at 08:00 local time.
Schedule::command('birthdays:reward')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->onOneServer();

// Automation heartbeat: resume waiting runs + start time-based triggers.
// Runs every minute but is no-op when there's nothing to do, so it's cheap.
Schedule::command('automations:tick')
    ->everyMinute()
    ->withoutOverlapping()
    ->onOneServer();
