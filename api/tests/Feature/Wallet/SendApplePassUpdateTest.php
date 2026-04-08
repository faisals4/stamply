<?php

namespace Tests\Feature\Wallet;

use App\Jobs\SendApplePassUpdate;
use App\Models\ApplePassRegistration;
use App\Models\IssuedCard;
use App\Services\Wallet\Apple\ApplePushNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The job's job (heh) is to translate "this card's stamps changed"
 * into "ping every device that registered for it via APNs". The push
 * itself is delegated to ApplePushNotifier — we swap a fake one in to
 * verify the routing without actually opening a TLS connection to
 * Apple.
 */
class SendApplePassUpdateTest extends TestCase
{
    use RefreshDatabase;

    private IssuedCard $card;

    protected function setUp(): void
    {
        parent::setUp();

        $tenantId = DB::table('tenants')->insertGetId([
            'name' => 'Test Tenant',
            'subdomain' => 'test',
            'plan' => 'trial',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $customerId = DB::table('customers')->insertGetId([
            'tenant_id' => $tenantId,
            'phone' => '+966500000002',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->card = IssuedCard::withoutEvents(function () use ($tenantId, $customerId) {
            return IssuedCard::create([
                'tenant_id' => $tenantId,
                'customer_id' => $customerId,
                'serial_number' => 'JOBSERIAL01',
                'stamps_count' => 1,
                'apple_auth_token' => str_repeat('a', 64),
                'pass_updated_at' => 1_700_000_000,
            ]);
        });
    }

    public function test_handle_pushes_to_each_registration_and_returns_quietly_on_200(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'DEV1',
            'push_token' => 'token-one',
        ]);
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'DEV2',
            'push_token' => 'token-two',
        ]);

        $fake = new FakeApplePushNotifier(['token-one' => 200, 'token-two' => 200]);
        $this->app->instance(ApplePushNotifier::class, $fake);

        (new SendApplePassUpdate($this->card->id))->handle($fake);

        $this->assertSame(['token-one', 'token-two'], $fake->pushed);
        $this->assertSame(2, ApplePassRegistration::where('issued_card_id', $this->card->id)->count());
    }

    public function test_handle_deletes_registrations_that_return_410(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'DEAD',
            'push_token' => 'gone',
        ]);
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'LIVE',
            'push_token' => 'alive',
        ]);

        $fake = new FakeApplePushNotifier(['gone' => 410, 'alive' => 200]);

        (new SendApplePassUpdate($this->card->id))->handle($fake);

        $this->assertDatabaseMissing('apple_pass_registrations', [
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'DEAD',
        ]);
        $this->assertDatabaseHas('apple_pass_registrations', [
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'LIVE',
        ]);
    }

    public function test_handle_throws_on_5xx_so_the_queue_retries(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => 'DEV',
            'push_token' => 'broken',
        ]);

        $fake = new FakeApplePushNotifier(['broken' => 503]);

        $this->expectException(\RuntimeException::class);
        (new SendApplePassUpdate($this->card->id))->handle($fake);
    }

    public function test_handle_is_a_noop_for_a_card_with_no_registrations(): void
    {
        $fake = new FakeApplePushNotifier([]);

        // Should not throw and should not call the notifier.
        (new SendApplePassUpdate($this->card->id))->handle($fake);

        $this->assertSame([], $fake->pushed);
    }
}

/**
 * Stub that records pushed tokens and returns canned status codes.
 */
class FakeApplePushNotifier extends ApplePushNotifier
{
    /** @var string[] */
    public array $pushed = [];

    /** @param array<string,int> $statuses */
    public function __construct(private readonly array $statuses)
    {
        // Intentionally skip parent constructor — we don't need
        // PlatformSettingsService for the fake.
    }

    public function push(string $pushToken): int
    {
        $this->pushed[] = $pushToken;

        return $this->statuses[$pushToken] ?? 200;
    }
}
