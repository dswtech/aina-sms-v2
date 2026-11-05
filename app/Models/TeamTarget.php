<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['team_id', 'period', 'target_units', 'target_value', 'created_by_id'])]
class TeamTarget extends Model
{
    /** @return HasMany<TeamTargetRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(TeamTargetRevision::class);
    }

    protected function casts(): array
    {
        return ['period' => 'date', 'target_units' => 'integer', 'target_value' => 'integer'];
    }
}
