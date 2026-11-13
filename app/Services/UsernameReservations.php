<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use App\Support\Rand;
use App\Support\RandomizerRand;
use App\Support\UsernameExhausted;
use App\Support\UsernameGenerator;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Generates and holds usernames for new accounts. Call inside the transaction that creates
 * the invitation, so a rollback releases the hold together with the invitation row.
 */
final class UsernameReservations
{
    public const MAX_ROUNDS = 5;

    public function __construct(private readonly Rand $rand = new RandomizerRand) {}

    /** @throws UsernameExhausted */
    public function reserve(string $name): string
    {
        $rejected = [];

        for ($round = 0; $round < self::MAX_ROUNDS; $round++) {
            $candidate = (new UsernameGenerator(
                $this->rand,
                fn (string $candidate): bool => isset($rejected[$candidate]) || $this->taken($candidate),
            ))->generate($name);

            if ($this->hold($candidate)) {
                return $candidate;
            }

            // Another transaction holds it; it may still roll back, so only skip it for this call.
            $rejected[$candidate] = true;
        }

        throw new UsernameExhausted;
    }

    /** Insert the hold; false when another transaction already holds the name. */
    public function hold(string $username): bool
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('Hold usernames inside the transaction that creates the account.');
        }

        return DB::table('username_reservations')->insertOrIgnore([
            'username' => $username,
            'created_at' => now(),
            'updated_at' => now(),
        ]) === 1;
    }

    /** Every place a login name can live: accounts, pending invitations from before reservations, and holds. */
    public function taken(string $username): bool
    {
        return User::query()->where('username', $username)->exists()
            || Invitation::query()->where('username', $username)->whereNull('accepted_at')->whereNull('revoked_at')->exists()
            || DB::table('username_reservations')->where('username', $username)->exists();
    }

    /** @param  string|array<string>  $usernames */
    public function release(string|array $usernames): void
    {
        DB::table('username_reservations')->whereIn('username', (array) $usernames)->delete();
    }
}
