<?php

namespace App\Models;

use App\Services\TransactionMasters;
use Database\Factories\DealerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['public_id', 'name', 'timezone', 'is_active'])]
class Dealer extends Model
{
    /** @use HasFactory<DealerFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::created(fn (Dealer $dealer) => TransactionMasters::initialize((int) $dealer->getKey()));
    }

    /**
     * @return HasMany<Team, $this>
     */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
