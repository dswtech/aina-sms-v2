<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeamMembership>
 */
class TeamMembershipFactory extends Factory
{
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => fn (array $attributes) => User::factory()->create([
                'dealer_id' => Team::query()->whereKey($attributes['team_id'])->sole()->dealer_id,
            ])->id,
            'role' => UserRole::Sales,
            'assigned_by_id' => null,
            'started_at' => now(),
            'ended_at' => null,
        ];
    }

    public function ended(): static
    {
        return $this->state(fn () => ['ended_at' => now()]);
    }
}
