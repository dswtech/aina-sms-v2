<?php

namespace App\Models;

use App\Support\TargetUnits;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['team_target_id', 'changed_by_id', 'old_target_units', 'old_target_value', 'new_target_units', 'new_target_value', 'old_plan', 'new_plan'])]
class TeamTargetRevision extends Model
{
    /** @return Attribute<int|float|null, never> */
    protected function oldTargetUnits(): Attribute
    {
        return Attribute::get(fn ($value) => $value === null ? null : TargetUnits::number(TargetUnits::scaled($value)));
    }

    /** @return Attribute<int|float, never> */
    protected function newTargetUnits(): Attribute
    {
        return Attribute::get(fn ($value) => TargetUnits::number(TargetUnits::scaled($value)));
    }

    protected function casts(): array
    {
        return ['old_plan' => 'array', 'new_plan' => 'array'];
    }
}
