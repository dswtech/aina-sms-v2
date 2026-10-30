<?php

namespace App\Models;

use App\Enums\ActivityType;
use App\Enums\UserRole;
use App\Support\PhoneNormalizer;
use Carbon\CarbonInterface;
use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $public_id
 * @property int $dealer_id
 * @property int|null $created_by_id
 * @property string $name
 * @property string $phone
 * @property string|null $email
 * @property string|null $address
 * @property string|null $contact_channel_preference
 * @property bool $opt_out
 * @property CarbonInterface|null $last_contact_at
 * @property string|null $notes
 * @property-read CustomerAssignment|null $activeAssignment
 * @property-read User|null $assignedSales
 * @property-read FollowUp|null $nextFollowUp
 */
#[Fillable([
    'public_id',
    'dealer_id',
    'created_by_id',
    'name',
    'phone',
    'email',
    'address',
    'contact_channel_preference',
    'opt_out',
    'last_contact_at',
    'notes',
])]
class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Customer $customer): void {
            if (empty($customer->public_id)) {
                $customer->public_id = (string) Str::uuid();
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
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @return HasMany<CustomerAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(CustomerAssignment::class);
    }

    /**
     * @return HasMany<DealTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(DealTransaction::class);
    }

    /**
     * @return HasMany<CustomerActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(CustomerActivity::class)->orderBy('occurred_at', 'desc');
    }

    /**
     * @return HasMany<FollowUp, $this>
     */
    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class);
    }

    /**
     * @return HasOne<FollowUp, $this>
     */
    public function nextFollowUp(): HasOne
    {
        return $this->hasOne(FollowUp::class)
            ->where('status', 'pending')
            ->orderBy('scheduled_at', 'asc');
    }

    public function logActivity(User $actor, ActivityType $type, string $notes, ?DealTransaction $deal = null, ?CarbonInterface $occurredAt = null): CustomerActivity
    {
        $at = $occurredAt ?? now();

        return DB::transaction(function () use ($actor, $type, $notes, $deal, $at): CustomerActivity {
            $activity = $this->activities()->create([
                'deal_transaction_id' => $deal?->id,
                'user_id' => $actor->id,
                'type' => $type,
                'notes' => $notes,
                'occurred_at' => $at,
            ]);

            $this->update(['last_contact_at' => $at]);

            if ($deal !== null) {
                $deal->update(['last_activity_at' => $at]);
            }

            return $activity;
        });
    }

    public function scheduleFollowUp(User $actor, User $assignedTo, CarbonInterface $scheduledAt, string $planNotes, ?DealTransaction $deal = null): FollowUp
    {
        return $this->followUps()->create([
            'deal_transaction_id' => $deal?->id,
            'assigned_to_id' => $assignedTo->id,
            'created_by_id' => $actor->id,
            'scheduled_at' => $scheduledAt,
            'plan_notes' => $planNotes,
            'status' => 'pending',
        ]);
    }

    /**
     * @return HasOne<CustomerAssignment, $this>
     */
    public function activeAssignment(): HasOne
    {
        return $this->hasOne(CustomerAssignment::class)->whereNull('ended_at');
    }

    public function getAssignedSalesAttribute(): ?User
    {
        return $this->activeAssignment?->sales;
    }

    public function assignTo(User $sales, ?User $assignedBy = null, ?string $notes = null): CustomerAssignment
    {
        return DB::transaction(function () use ($sales, $assignedBy, $notes): CustomerAssignment {
            $this->assignments()->whereNull('ended_at')->update(['ended_at' => now()]);

            return $this->assignments()->create([
                'sales_id' => $sales->id,
                'assigned_by_id' => $assignedBy?->id,
                'started_at' => now(),
                'ended_at' => null,
                'notes' => $notes,
            ]);
        });
    }

    /**
     * @param  Builder<Customer>  $query
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
                $q->whereHas('activeAssignment', function (Builder $sub) use ($salesUserIds): void {
                    $sub->whereIn('sales_id', $salesUserIds);
                })->orWhere('created_by_id', $actor->id);
            });

            return;
        }

        $query->whereHas('activeAssignment', function (Builder $sub) use ($actor): void {
            $sub->where('sales_id', $actor->id);
        });
    }

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = PhoneNormalizer::normalize($value) ?? (string) $value;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'opt_out' => 'boolean',
            'last_contact_at' => 'datetime',
        ];
    }
}
