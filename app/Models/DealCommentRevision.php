<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $deal_comment_id
 * @property int $edited_by_id
 * @property string $old_body
 * @property Carbon $edited_at
 */
#[Fillable([
    'deal_comment_id',
    'edited_by_id',
    'old_body',
    'edited_at',
])]
class DealCommentRevision extends Model
{
    /**
     * @return BelongsTo<DealComment, $this>
     */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(DealComment::class, 'deal_comment_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by_id');
    }

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }
}
