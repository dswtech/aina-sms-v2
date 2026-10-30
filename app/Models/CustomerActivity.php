<?php

namespace App\Models;

use App\Enums\ActivityType;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $customer_id
 * @property int|null $deal_transaction_id
 * @property int $user_id
 * @property ActivityType $type
 * @property string $notes
 * @property CarbonInterface $occurred_at
 */
#[Fillable([
    'customer_id',
    'deal_transaction_id',
    'user_id',
    'type',
    'notes',
    'occurred_at',
])]
class CustomerActivity extends Model
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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ActivityType::class,
            'occurred_at' => 'datetime',
        ];
    }
}
