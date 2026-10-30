<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $deal_transaction_id
 * @property int $user_id
 * @property int|null $parent_id
 * @property string $body
 * @property Carbon|null $edited_at
 */
#[Fillable([
    'deal_transaction_id',
    'user_id',
    'parent_id',
    'body',
    'edited_at',
])]
class DealComment extends Model
{
    /**
     * @return BelongsTo<DealTransaction, $this>
     */
    public function deal(): BelongsTo
    {
        return $this->belongsTo(DealTransaction::class, 'deal_transaction_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<DealComment, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<DealComment, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * @return HasMany<DealCommentRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(DealCommentRevision::class);
    }

    public function canEdit(User $actor): bool
    {
        if ($this->user_id !== $actor->id) {
            return false;
        }

        return $this->created_at !== null
            && $this->created_at->greaterThan(now()->subMinutes(5));
    }

    /**
     * @param  Builder<DealComment>  $query
     */
    public function scopeForDeal(Builder $query, DealTransaction $deal): void
    {
        $query->where('deal_transaction_id', $deal->id);
    }

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }
}
