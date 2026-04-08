<?php

namespace App\Events;

use App\Models\Customer;
use App\Models\IssuedCard;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired after the cashier successfully gives a stamp. Wired so future
 * automations (e.g. "after the 5th stamp send a thank-you SMS") can hook in
 * without further plumbing.
 */
class StampGiven
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Customer $customer,
        public IssuedCard $card,
        public int $count,
    ) {}
}
