<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'public_id' => (string) Str::uuid(),
            'dealer_id' => Dealer::factory(),
            'created_by_id' => User::factory(),
            'name' => fake()->name(),
            'phone' => '+6281'.fake()->numerify('########'),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'contact_channel_preference' => fake()->randomElement(['whatsapp', 'phone', null]),
            'opt_out' => false,
            'last_contact_at' => null,
            'notes' => fake()->sentence(),
        ];
    }

    public function optOut(): static
    {
        return $this->state(fn () => ['opt_out' => true]);
    }
}
