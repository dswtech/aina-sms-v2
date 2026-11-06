<?php

namespace App\Models;

use App\Enums\PipelineStage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
 * @property int|null $reverses_stage_history_id
 * @property bool|null $po_confirmed
 * @property bool|null $dp_confirmed
 * @property bool|null $unit_confirmed
 */
#[Fillable([
    'deal_transaction_id',
    'from_stage',
    'to_stage',
    'actor_id',
    'notes',
    'created_at',
    'po_confirmed',
    'dp_confirmed',
    'unit_confirmed',
    'reverses_stage_history_id',
])]
class StageHistory extends Model
{
    public $timestamps = false;

    public function hasDoChecklist(): bool
    {
        return $this->po_confirmed && $this->dp_confirmed && $this->unit_confirmed;
    }

    /** @param Builder<StageHistory> $query */
    public function scopeNotReversed(Builder $query): void
    {
        $query->whereNotExists(function ($reversals) use ($query): void {
            $reversals->selectRaw('1')->from('stage_histories as reversals')
                ->whereColumn('reversals.reverses_stage_history_id', $query->qualifyColumn('id'));
        });
    }

    /** @param Builder<StageHistory> $query */
    public function scopeRealizedDo(Builder $query): void
    {
        $query->where('to_stage', PipelineStage::Do)
            ->where('po_confirmed', true)
            ->where('dp_confirmed', true)
            ->where('unit_confirmed', true)
            ->notReversed();
    }

    /** @param Builder<StageHistory> $query */
    public function scopeReportableAchievement(Builder $query): void
    {
        $query->whereNull('reverses_stage_history_id')
            ->where(fn ($history) => $history->where('to_stage', '<>', PipelineStage::Do)
                ->orWhere(fn ($do) => $do->realizedDo()));
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
            'po_confirmed' => 'boolean',
            'dp_confirmed' => 'boolean',
            'unit_confirmed' => 'boolean',
        ];
    }
}
