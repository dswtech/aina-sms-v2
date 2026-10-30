<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $customer_id
 * @property int $sales_id
 * @property int|null $assigned_by_id
 * @property Carbon $started_at
 * @property Carbon|null $ended_at
 * @property string|null $notes
 */
#[Fillable([
    'customer_id',
    'sales_id',
    'assigned_by_id',
    'started_at',
    'ended_at',
    'notes',
])]
class CustomerAssignment extends Model
{
    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    /**
     * @param  Builder<CustomerAssignment>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }
}
