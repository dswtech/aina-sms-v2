<?php

namespace App\Models;

use App\Enums\PipelineStage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $deal_transaction_id
 * @property PipelineStage|null $from_stage
 * @property PipelineStage $to_stage
 * @property int $actor_id
 * @property string|null $notes
 * @property Carbon $created_at
 */
#[Fillable([
    'deal_transaction_id',
    'from_stage',
    'to_stage',
    'actor_id',
    'notes',
    'created_at',
])]
class StageHistory extends Model
{
    public $timestamps = false;

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
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_stage' => PipelineStage::class,
            'to_stage' => PipelineStage::class,
            'created_at' => 'datetime',
        ];
    }
}
