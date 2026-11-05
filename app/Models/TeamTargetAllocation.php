<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['team_target_id', 'user_id', 'target_units'])]
class TeamTargetAllocation extends Model
{
    /** @return BelongsTo<TeamTarget, $this> */
    public function target(): BelongsTo
    {
        return $this->belongsTo(TeamTarget::class, 'team_target_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return ['target_units' => 'decimal:4'];
    }
}
