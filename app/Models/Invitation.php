<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\InvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $dealer_id
 * @property int|null $team_id
 * @property int $invited_by_id
 * @property string $public_id
 * @property string $name
 * @property string $username
 * @property string $email
 * @property UserRole $role
 * @property string $token_hash
 * @property Carbon $expires_at
 * @property Carbon|null $accepted_at
 * @property Carbon|null $revoked_at
 */
#[Fillable([
    'public_id', 'dealer_id', 'team_id', 'invited_by_id', 'name', 'username',
    'email', 'role', 'token_hash', 'expires_at', 'accepted_at', 'revoked_at',
])]
class Invitation extends Model
{
    /** @use HasFactory<InvitationFactory> */
    use HasFactory;

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function state(): string
    {
        return match (true) {
            $this->accepted_at !== null => 'used',
            $this->revoked_at !== null => 'revoked',
            $this->expires_at->isPast() => 'expired',
            default => 'valid',
        };
    }

    /** @return BelongsTo<Dealer, $this> */
    public function dealer(): BelongsTo
    {
        return $this->belongsTo(Dealer::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<User, $this> */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_id');
    }

    /** @param Builder<Invitation> $query */
    public function scopeVisibleTo(Builder $query, User $actor): void
    {
        if (! $actor->is_active || $actor->dealer_id === null || $actor->role !== UserRole::Admin) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where('dealer_id', $actor->dealer_id);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }
}
