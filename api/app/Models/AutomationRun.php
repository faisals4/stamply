<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AutomationRun extends Model
{
    use HasFactory, BelongsToTenant;

    public const STATUSES = ['queued', 'running', 'waiting', 'completed', 'failed', 'cancelled'];

    protected $fillable = [
        'tenant_id',
        'automation_id',
        'customer_id',
        'status',
        'current_step_index',
        'wait_until',
        'context',
        'error_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'context' => 'array',
        'wait_until' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function automation(): BelongsTo
    {
        return $this->belongsTo(Automation::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AutomationLog::class, 'run_id');
    }
}
