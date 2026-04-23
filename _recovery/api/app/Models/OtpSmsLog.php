<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpSmsLog extends Model
{
    protected $fillable = [
        'phone',
        'phone_masked',
        'country_code',
        'context',
        'device_type',
        'provider',
        'status',
        'verification_id',
        'error_message',
    ];
}
