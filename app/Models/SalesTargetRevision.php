<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'sales_target_id',
    'changed_by_id',
    'old_target_units',
    'old_target_value',
    'new_target_units',
    'new_target_value',
])]
class SalesTargetRevision extends Model
{
    /** @return BelongsTo<SalesTarget, $this> */
    public function target(): BelongsTo
    {
        return $this->belongsTo(SalesTarget::class, 'sales_target_id');
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_id');
    }
}
