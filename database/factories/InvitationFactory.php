<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Invitation> */
class InvitationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'public_id' => (string) Str::uuid(),
            'dealer_id' => Dealer::factory(),
            'team_id' => null,
            'invited_by_id' => fn (array $attributes) => User::factory()
                ->role(UserRole::Admin)
                ->create(['dealer_id' => $attributes['dealer_id']])->id,
            'name' => fake()->name(),
            'username' => fake()->unique()->lexify('????????????'),
            'email' => fake()->unique()->safeEmail(),
            'role' => UserRole::BranchManager,
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
            'revoked_at' => null,
        ];
    }
}
