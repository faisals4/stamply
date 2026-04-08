<?php

namespace App\Services\Auth;

/**
 * Value object returned by OtpService::sendCode(). Keeps the controller
 * layer free of cache/rate-limit branching — it just pattern-matches on
 * `$result->status` and renders JSON.
 */
class SendResult
{
    public const STATUS_SENT = 'sent';
    public const STATUS_INVALID_PHONE = 'invalid_phone';
    public const STATUS_RATE_LIMITED = 'rate_limited';
    public const STATUS_COOLDOWN = 'cooldown';

    public function __construct(
        public readonly string $status,
        public readonly ?string $phone = null,
        public readonly ?string $phoneMasked = null,
        public readonly ?int $expiresIn = null,
        public readonly ?int $retryAfter = null,
        public readonly ?string $debugCode = null,
    ) {}

    public static function sent(string $phone, string $phoneMasked, int $expiresIn, ?string $debugCode = null): self
    {
        return new self(
            status: self::STATUS_SENT,
            phone: $phone,
            phoneMasked: $phoneMasked,
            expiresIn: $expiresIn,
            debugCode: $debugCode,
        );
    }

    public static function invalidPhone(): self
    {
        return new self(status: self::STATUS_INVALID_PHONE);
    }

    public static function rateLimited(int $retryAfter): self
    {
        return new self(status: self::STATUS_RATE_LIMITED, retryAfter: $retryAfter);
    }

    public static function cooldown(int $retryAfter): self
    {
        return new self(status: self::STATUS_COOLDOWN, retryAfter: $retryAfter);
    }

    public function isSent(): bool
    {
        return $this->status === self::STATUS_SENT;
    }
}
