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
 * @property array<string, mixed>|null $area_snapshot
 * @property array<string, mixed>|null $financing_snapshot
 */
#[Fillable([
    'area_snapshot', 'financing_snapshot',
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

    /**
     * Rows that give the deal a valid date for the stage: not a correction, a realized DO for DO,
     * and an open stage not voided by a later move back below it.
     *
     * @param  Builder<StageHistory>  $query
     */
    public function scopeEffectiveFor(Builder $query, PipelineStage $stage): void
    {
        $query->whereNull($query->qualifyColumn('reverses_stage_history_id'));
        if ($stage === PipelineStage::Do) {
            $query->realizedDo();

            return;
        }
        $query->where($query->qualifyColumn('to_stage'), $stage);

        $rank = $stage->openRank();
        $lower = array_map(fn (PipelineStage $s) => $s->value, array_values(array_filter(
            PipelineStage::cases(),
            fn (PipelineStage $s) => $rank !== null && $s->openRank() !== null && $s->openRank() < $rank,
        )));
        if ($lower === []) {
            return;
        }

        $query->whereNotExists(function ($later) use ($query, $lower): void {
            $created = $query->qualifyColumn('created_at');
            $later->selectRaw('1')->from('stage_histories as later')
                ->whereColumn('later.deal_transaction_id', $query->qualifyColumn('deal_transaction_id'))
                ->whereNull('later.reverses_stage_history_id')
                ->whereIn('later.to_stage', $lower)
                ->where(fn ($after) => $after->whereColumn('later.created_at', '>', $created)
                    ->orWhere(fn ($tie) => $tie->whereColumn('later.created_at', $created)
                        ->whereColumn('later.id', '>', $query->qualifyColumn('id'))));
        });
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
            'area_snapshot' => 'array',
            'financing_snapshot' => 'array',
            'from_stage' => PipelineStage::class,
            'to_stage' => PipelineStage::class,
            'created_at' => 'datetime',
            'po_confirmed' => 'boolean',
            'dp_confirmed' => 'boolean',
            'unit_confirmed' => 'boolean',
        ];
    }
}
