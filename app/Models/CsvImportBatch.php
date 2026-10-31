<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'dealer_id',
    'user_id',
    'original_filename',
    'file_path',
    'status',
    'total_rows',
    'accepted_count',
    'rejected_count',
    'started_at',
    'completed_at',
])]
class CsvImportBatch extends Model
{
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Dealer, $this> */
    public function dealer(): BelongsTo
    {
        return $this->belongsTo(Dealer::class);
    }

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
