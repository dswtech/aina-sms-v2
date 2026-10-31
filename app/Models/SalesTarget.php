<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'period', 'target_units', 'target_value', 'created_by_id'])]
class SalesTarget extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<SalesTargetRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(SalesTargetRevision::class);
    }

    protected function casts(): array
    {
        return [
            'period' => 'date',
            'target_value' => 'integer',
        ];
    }
}
