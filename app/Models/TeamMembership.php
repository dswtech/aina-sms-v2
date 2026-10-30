<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\TeamMembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['team_id', 'user_id', 'role', 'assigned_by_id', 'started_at', 'ended_at'])]
class TeamMembership extends Model
{
    /** @use HasFactory<TeamMembershipFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    /**
     * @param  Builder<TeamMembership>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    /**
     * @param  Builder<TeamMembership>  $query
     */
    public function scopeVisibleTo(Builder $query, User $actor): void
    {
        if (! $actor->is_active || $actor->dealer_id === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereHas('team', fn (Builder $query) => $query->where('dealer_id', $actor->dealer_id));

        if (in_array($actor->role, [UserRole::Admin, UserRole::BranchManager], true)) {
            return;
        }

        if ($actor->role === UserRole::Supervisor) {
            $query->whereIn('team_id', $actor->activeTeamMemberships()
                ->where('role', UserRole::Supervisor)
                ->select('team_id'));

            return;
        }

        $query->where('user_id', $actor->id);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }
}
