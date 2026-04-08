<?php

namespace App\Events;

use App\Models\Customer;
use App\Models\IssuedCard;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired immediately after a brand new issued_card is created for a customer
 * via the public registration flow. Used by AutomationDispatcher to start
 * any automations whose trigger_type='card_issued'.
 */
class CardIssued
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Customer $customer,
        public IssuedCard $card,
    ) {}
}
