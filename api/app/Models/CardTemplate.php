<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CardTemplate extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'public_slug',
        'name',
        'description',
        'type',
        'status',
        'design',
        'settings',
        'notifications',
    ];

    protected $casts = [
        'design' => 'array',
        'settings' => 'array',
        'notifications' => 'array',
    ];

    /**
     * Canonical list of lifecycle notification triggers. Adding a new
     * trigger is a two-line change here + a hook wherever the event
     * fires (CashierController, PublicCardController, scheduled jobs).
     */
    public const NOTIFICATION_TRIGGERS = [
        'welcome',
        'halfway',
        'almost_there',
        'reward_ready',
        'redeemed',
    ];

    /**
     * Default notifications seeded on every new card template. The
     * merchant can toggle / edit any of these from the editor's
     * Notifications tab. Bilingual: the dispatcher picks `_ar` or
     * `_en` based on the recipient's `customer.locale` column.
     */
    public static function defaultNotifications(): array
    {
        return [
            'welcome' => [
                'enabled' => true,
                'message_ar' => 'مرحباً {{customer.first_name}}! اجمع الأختام واحصل على مكافأتك ☕',
                'message_en' => 'Welcome {{customer.first_name}}! Collect stamps to earn your reward ☕',
            ],
            'halfway' => [
                'enabled' => false,
                'message_ar' => 'أنت في منتصف الطريق ✨ باقي {{stamps_remaining}} أختام فقط',
                'message_en' => "You're halfway there ✨ Only {{stamps_remaining}} stamps to go",
            ],
            'almost_there' => [
                'enabled' => true,
                'message_ar' => '☕ باقي لك خطوة واحدة وتحصل على مكافأتك 🎉',
                'message_en' => '☕ Just one more step to your reward 🎉',
            ],
            'reward_ready' => [
                'enabled' => true,
                'message_ar' => '🎁 مبروك! حصلت على مكافأتك. استبدلها الآن',
                'message_en' => '🎁 Congrats! Your reward is ready. Redeem it now',
            ],
            'redeemed' => [
                'enabled' => true,
                'message_ar' => 'شكراً لزيارتك! بطاقتك الجديدة بدأت من جديد ✨',
                'message_en' => 'Thanks for visiting! Your new card has started ✨',
            ],
        ];
    }

    /**
     * Read the notification config with defaults merged in. Any
     * trigger the merchant hasn't customised falls back to the
     * seeded default — so editing one trigger never silently erases
     * the others.
     */
    public function getNotificationsConfig(): array
    {
        $stored = $this->notifications ?? [];
        $defaults = static::defaultNotifications();

        $merged = [];
        foreach (static::NOTIFICATION_TRIGGERS as $key) {
            $merged[$key] = array_merge(
                $defaults[$key] ?? [],
                $stored[$key] ?? [],
            );
        }

        return $merged;
    }

    protected static function booted(): void
    {
        static::creating(function (CardTemplate $card) {
            if (empty($card->public_slug)) {
                $card->public_slug = static::generateUniqueSlug();
            }
        });
    }

    /**
     * Generate a short alphanumeric public slug. Starts at 3 chars and grows
     * automatically as the name space saturates — when over 50% of the 3-char
     * space (~28k) is used we move to 4 chars, and so on.
     *
     * Crockford-style alphabet: no 0/O/I/1/L confusion.
     */
    public static function generateUniqueSlug(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // 31 chars
        $alphabetLen = strlen($alphabet);

        // Compute target length based on existing count.
        // 31^3 = 29,791 — switch to 4 at ~15,000 cards.
        // 31^4 = 923,521 — switch to 5 at ~460,000 cards. Etc.
        $count = static::withoutGlobalScopes()->count();
        $length = 3;
        $capacity = $alphabetLen ** $length;
        while ($count > $capacity / 2) {
            $length++;
            $capacity = $alphabetLen ** $length;
        }

        // Try to generate a unique slug. Up to 20 attempts before bumping length.
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $slug = '';
            for ($i = 0; $i < $length; $i++) {
                $slug .= $alphabet[random_int(0, $alphabetLen - 1)];
            }
            $exists = static::withoutGlobalScopes()
                ->where('public_slug', $slug)
                ->exists();
            if (! $exists) {
                return $slug;
            }
        }

        // Fallback: bump length and try once more
        $longerLength = $length + 1;
        do {
            $slug = '';
            for ($i = 0; $i < $longerLength; $i++) {
                $slug .= $alphabet[random_int(0, $alphabetLen - 1)];
            }
        } while (
            static::withoutGlobalScopes()->where('public_slug', $slug)->exists()
        );

        return $slug;
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(CardReward::class);
    }

    public function issuedCards(): HasMany
    {
        return $this->hasMany(IssuedCard::class);
    }

    /**
     * Branches this card is "available at" for the purpose of geofence
     * notifications. Each linked location is injected into the Apple
     * Wallet `pass.json::locations` array (and the Google Wallet
     * equivalent) so the customer's phone surfaces this pass on the
     * lock screen when they enter the branch's geofence radius.
     *
     * Apple caps `pass.json::locations` at 10 entries — enforced both
     * in the editor UI and in `ApplePassBuilder` when reading.
     */
    public function locations(): BelongsToMany
    {
        return $this->belongsToMany(Location::class, 'card_template_location')
            ->withTimestamps();
    }
}
