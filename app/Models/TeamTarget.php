<?php

namespace App\Models;

use App\Support\TargetUnits;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['team_id', 'period', 'target_units', 'target_value', 'created_by_id', 'markup_percent', 'benchmark_units', 'version'])]
class TeamTarget extends Model
{
    /** @return HasMany<TeamTargetAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(TeamTargetAllocation::class);
    }

    /** @return Attribute<int|float, never> */
    protected function targetUnits(): Attribute
    {
        return Attribute::get(fn ($value) => TargetUnits::number(TargetUnits::scaled($value)));
    }

    /** @return HasMany<TeamTargetRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(TeamTargetRevision::class);
    }

    protected function casts(): array
    {
        return ['period' => 'date', 'target_value' => 'integer', 'markup_percent' => 'decimal:4', 'benchmark_units' => 'decimal:4', 'version' => 'integer'];
    }
}
