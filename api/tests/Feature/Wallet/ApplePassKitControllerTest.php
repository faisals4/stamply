<?php

namespace Tests\Feature\Wallet;

use App\Models\ApplePassRegistration;
use App\Models\IssuedCard;
use App\Services\PlatformSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Covers the Apple Wallet PassKit web service contract:
 *   - register / unregister with the per-card auth token
 *   - listUpdated honours the passesUpdatedSince watermark
 *   - getLatestPass returns 304 when If-Modified-Since is current
 *   - log endpoint accepts the iOS error envelope without auth
 *   - mismatched pass type identifiers always reject with 401
 *
 * The .pkpass signing path needs a real Pass Type ID certificate, so
 * those tests stop at the boundary — they verify the controller's
 * authorization + 304 logic, not ApplePassBuilder's openssl wiring.
 */
class ApplePassKitControllerTest extends TestCase
{
    use RefreshDatabase;

    private const PTID = 'pass.com.stamply.test';

    private const TOKEN = 'test-auth-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    private const DEVICE = 'DEVICELIB000000000001';

    private IssuedCard $card;

    protected function setUp(): void
    {
        parent::setUp();

        // Stub the platform settings so the controller's pass-type guard
        // sees a configured value without us touching real credentials.
        $this->app->bind(PlatformSettingsService::class, function () {
            return new class extends PlatformSettingsService
            {
                public function get(string $key): array
                {
                    if ($key === 'wallet.apple') {
                        return [
                            'pass_type_id' => ApplePassKitControllerTest::PTID,
                            'team_id' => 'TEAM123',
                            'cert_pem' => '',
                            'key_pem' => '',
                        ];
                    }

                    return [];
                }
            };
        });

        // Minimal tenant + customer needed for the issued_cards FKs.
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
            'phone' => '+966500000001',
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->card = IssuedCard::withoutEvents(function () use ($tenantId, $customerId) {
            return IssuedCard::create([
                'tenant_id' => $tenantId,
                'customer_id' => $customerId,
                'serial_number' => 'SERIAL000001',
                'stamps_count' => 3,
                'apple_auth_token' => self::TOKEN,
                'pass_updated_at' => 1_700_000_000,
            ]);
        });
    }

    public function test_register_creates_a_new_registration_and_returns_201(): void
    {
        $response = $this->withHeaders([
            'Authorization' => 'ApplePass '.self::TOKEN,
        ])->postJson(
            "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID."/{$this->card->serial_number}",
            ['pushToken' => 'deadbeefcafe']
        );

        $response->assertStatus(201);
        $this->assertDatabaseHas('apple_pass_registrations', [
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
            'push_token' => 'deadbeefcafe',
        ]);
    }

    public function test_register_is_idempotent_and_returns_200_when_row_exists(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
            'push_token' => 'oldtoken',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'ApplePass '.self::TOKEN,
        ])->postJson(
            "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID."/{$this->card->serial_number}",
            ['pushToken' => 'newtoken']
        );

        $response->assertStatus(200);
        // Token should have been refreshed in place.
        $this->assertSame('newtoken', ApplePassRegistration::where('issued_card_id', $this->card->id)
            ->where('device_library_id', self::DEVICE)
            ->value('push_token'));
        // And we should have exactly one row, not two.
        $this->assertSame(1, ApplePassRegistration::where('issued_card_id', $this->card->id)->count());
    }

    public function test_register_rejects_wrong_auth_token_with_401(): void
    {
        $this->withHeaders(['Authorization' => 'ApplePass wrong'])
            ->postJson(
                "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID."/{$this->card->serial_number}",
                ['pushToken' => 'x']
            )
            ->assertStatus(401);
    }

    public function test_register_rejects_missing_authorization_header_with_401(): void
    {
        $this->postJson(
            "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID."/{$this->card->serial_number}",
            ['pushToken' => 'x']
        )->assertStatus(401);
    }

    public function test_register_rejects_unknown_pass_type_identifier_with_401(): void
    {
        $this->withHeaders(['Authorization' => 'ApplePass '.self::TOKEN])
            ->postJson(
                "/api/v1/devices/".self::DEVICE."/registrations/pass.com.attacker/{$this->card->serial_number}",
                ['pushToken' => 'x']
            )
            ->assertStatus(401);
    }

    public function test_unregister_removes_the_registration(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
            'push_token' => 'tok',
        ]);

        $response = $this->withHeaders(['Authorization' => 'ApplePass '.self::TOKEN])
            ->deleteJson(
                "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID."/{$this->card->serial_number}"
            );

        $response->assertStatus(200);
        $this->assertDatabaseMissing('apple_pass_registrations', [
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
        ]);
    }

    public function test_list_updated_returns_204_when_nothing_has_changed_since_tag(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
            'push_token' => 'tok',
        ]);

        // pass_updated_at = 1_700_000_000, so a tag of that exact value
        // means "I already have this version" → 204.
        $response = $this->getJson(
            "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID.'?passesUpdatedSince=1700000000'
        );

        $response->assertStatus(204);
    }

    public function test_list_updated_returns_changed_serials_with_lastUpdated(): void
    {
        ApplePassRegistration::create([
            'issued_card_id' => $this->card->id,
            'device_library_id' => self::DEVICE,
            'push_token' => 'tok',
        ]);

        $response = $this->getJson(
            "/api/v1/devices/".self::DEVICE."/registrations/".self::PTID.'?passesUpdatedSince=0'
        );

        $response->assertStatus(200)
            ->assertJson([
                'lastUpdated' => '1700000000',
                'serialNumbers' => [$this->card->serial_number],
            ]);
    }

    public function test_get_latest_pass_returns_304_when_if_modified_since_is_current(): void
    {
        // pass_updated_at = 1_700_000_000 → Tue, 14 Nov 2023 22:13:20 GMT
        $response = $this->withHeaders([
            'Authorization' => 'ApplePass '.self::TOKEN,
            'If-Modified-Since' => 'Tue, 14 Nov 2023 22:13:20 GMT',
        ])->get("/api/v1/passes/".self::PTID."/{$this->card->serial_number}");

        $response->assertStatus(304);
    }

    public function test_get_latest_pass_rejects_bad_token(): void
    {
        $this->withHeaders(['Authorization' => 'ApplePass garbage'])
            ->get("/api/v1/passes/".self::PTID."/{$this->card->serial_number}")
            ->assertStatus(401);
    }

    public function test_log_endpoint_accepts_logs_without_auth(): void
    {
        $response = $this->postJson('/api/v1/log', [
            'logs' => ['Pass not modified', 'Could not download pass'],
        ]);

        $response->assertStatus(200);
    }
}
