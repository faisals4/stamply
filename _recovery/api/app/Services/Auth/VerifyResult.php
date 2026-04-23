<?php

namespace App\Services\Auth;

/**
 * Value object returned by OtpService::verifyCode(). The service does
 * NOT touch the database on a successful verify — the controller decides
 * what "verified" means for its flow (updating phone_verified_at rows,
 * issuing a Sanctum token, both, or neither).
 */
class VerifyResult
{
    public const STATUS_SUCCESS = 'success';
    public const STATUS_INVALID_PHONE = 'invalid_phone';
    public const STATUS_NO_PENDING = 'no_pending_code';
    public const STATUS_TOO_MANY_ATTEMPTS = 'too_many_attempts';
    public const STATUS_INVALID_CODE = 'invalid_code';

    public function __construct(
        public readonly string $status,
        public readonly ?string $phone = null,
        public readonly bool $devBypass = false,
        public readonly ?int $attemptsLeft = null,
    ) {}

    public static function success(string $phone, bool $devBypass = false): self
    {
        return new self(status: self::STATUS_SUCCESS, phone: $phone, devBypass: $devBypass);
    }

    public static function invalidPhone(): self
    {
        return new self(status: self::STATUS_INVALID_PHONE);
    }

    public static function noPendingCode(): self
    {
        return new self(status: self::STATUS_NO_PENDING);
    }

    public static function tooManyAttempts(): self
    {
        return new self(status: self::STATUS_TOO_MANY_ATTEMPTS);
    }

    public static function invalidCode(int $attemptsLeft): self
    {
        return new self(status: self::STATUS_INVALID_CODE, attemptsLeft: $attemptsLeft);
    }

    public function isSuccess(): bool
    {
        return $this->status === self::STATUS_SUCCESS;
    }
}
