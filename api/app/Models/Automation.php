<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A tenant marketing automation.
 *
 * The trigger is stored on the row itself; the steps to execute when the
 * trigger fires are stored in `flow_json` as a flat array of step objects.
 * See FlowEngine for the execution semantics.
 */
class Automation extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    public const STATUSES = ['draft', 'active', 'paused'];

    public const TRIGGER_TYPES = ['card_issued', 'birthday', 'inactive', 'stamp_given'];

    public const STEP_TYPES = ['send_sms', 'send_email', 'send_push', 'add_stamps', 'wait', 'condition', 'stop'];

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'status',
        'trigger_type',
        'trigger_config',
        'flow_json',
        'total_runs',
        'last_run_at',
        'created_by',
    ];

    protected $casts = [
        'trigger_config' => 'array',
        'flow_json' => 'array',
        'last_run_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(AutomationRun::class);
    }
}
