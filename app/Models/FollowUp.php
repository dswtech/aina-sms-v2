<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $customer_id
 * @property int|null $deal_transaction_id
 * @property int $assigned_to_id
 * @property int $created_by_id
 * @property CarbonInterface $scheduled_at
 * @property string $plan_notes
 * @property string $status
 * @property CarbonInterface|null $completed_at
 */
#[Fillable([
    'customer_id',
    'deal_transaction_id',
    'assigned_to_id',
    'created_by_id',
    'scheduled_at',
    'plan_notes',
    'status',
    'completed_at',
])]
class FollowUp extends Model
{
    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<DealTransaction, $this>
     */
    public function dealTransaction(): BelongsTo
    {
        return $this->belongsTo(DealTransaction::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @param  Builder<FollowUp>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->where('status', 'pending');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
