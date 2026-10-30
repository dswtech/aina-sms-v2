<?php

namespace App\Models;

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Enums\UserRole;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * @property int $id
 * @property string $public_id
 * @property int $dealer_id
 * @property int $customer_id
 * @property int $sales_id
 * @property int|null $team_id
 * @property string $vehicle_model
 * @property int|null $estimated_value
 * @property string $source
 * @property PipelineStage $current_stage
 * @property CarbonInterface|null $booking_fee_confirmed_at
 * @property LostReason|null $lost_reason
 * @property string|null $lost_notes
 * @property CarbonInterface|null $last_activity_at
 * @property-read bool $is_stagnant
 */
#[Fillable([
    'public_id',
    'dealer_id',
    'customer_id',
    'sales_id',
    'team_id',
    'vehicle_model',
    'estimated_value',
    'source',
    'current_stage',
    'booking_fee_confirmed_at',
    'lost_reason',
    'lost_notes',
    'last_activity_at',
])]
class DealTransaction extends Model
{
    protected $attributes = [
        'current_stage' => 'lead',
        'source' => 'walk_in',
    ];

    protected static function booted(): void
    {
        static::creating(function (DealTransaction $deal): void {
            if (empty($deal->public_id)) {
                $deal->public_id = (string) Str::uuid();
            }
            if ($deal->last_activity_at === null) {
                $deal->last_activity_at = now();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * @return BelongsTo<Dealer, $this>
     */
    public function dealer(): BelongsTo
    {
        return $this->belongsTo(Dealer::class);
    }

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
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return HasMany<StageHistory, $this>
     */
    public function stageHistories(): HasMany
    {
        return $this->hasMany(StageHistory::class)->orderBy('created_at');
    }

    /**
     * @return HasMany<CustomerActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(CustomerActivity::class);
    }

    /**
     * @return HasMany<FollowUp, $this>
     */
    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class);
    }

    /**
     * A deal is stagnant if it is still active (not Delivery or Lost) and has no activity for > 3 days.
     */
    public function getIsStagnantAttribute(): bool
    {
        if ($this->current_stage->isClosed()) {
            return false;
        }

        $checkDate = $this->last_activity_at ?? $this->created_at;

        return $checkDate !== null && $checkDate->lessThan(now()->subDays(3));
    }

    /**
     * @param  array<string, mixed>  $options
     */
    public function transitionTo(PipelineStage $toStage, User $actor, ?string $notes = null, array $options = []): StageHistory
    {
        if ($toStage === PipelineStage::Spk && empty($options['booking_fee_confirmed'])) {
            throw new InvalidArgumentException('Konfirmasi booking fee diperlukan untuk tahap SPK.');
        }

        if ($toStage === PipelineStage::Lost && empty($options['lost_reason'])) {
            throw new InvalidArgumentException('Alasan lost wajib diisi.');
        }

        return DB::transaction(function () use ($toStage, $actor, $notes, $options): StageHistory {
            $fromStage = $this->current_stage;
            $this->current_stage = $toStage;
            $this->last_activity_at = now();

            if ($toStage === PipelineStage::Spk && ! empty($options['booking_fee_confirmed'])) {
                $this->booking_fee_confirmed_at = now();
            }

            if ($toStage === PipelineStage::Lost && ! empty($options['lost_reason'])) {
                $this->lost_reason = $options['lost_reason'] instanceof LostReason
                    ? $options['lost_reason']
                    : LostReason::from($options['lost_reason']);
                $this->lost_notes = $options['lost_notes'] ?? null;
            }

            $this->save();

            return $this->stageHistories()->create([
                'from_stage' => $fromStage,
                'to_stage' => $toStage,
                'actor_id' => $actor->id,
                'notes' => $notes,
                'created_at' => now(),
            ]);
        });
    }

    /**
     * @param  Builder<DealTransaction>  $query
     */
    public function scopeVisibleTo(Builder $query, User $actor): void
    {
        if (! $actor->is_active || $actor->dealer_id === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where('dealer_id', $actor->dealer_id);

        if (in_array($actor->role, [UserRole::Admin, UserRole::BranchManager], true)) {
            return;
        }

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $salesUserIds = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->whereNull('ended_at')
                ->select('user_id');

            $query->where(function (Builder $q) use ($salesUserIds, $actor): void {
                $q->whereIn('sales_id', $salesUserIds)
                    ->orWhere('sales_id', $actor->id);
            });

            return;
        }

        $query->where('sales_id', $actor->id);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_stage' => PipelineStage::class,
            'lost_reason' => LostReason::class,
            'booking_fee_confirmed_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }
}
