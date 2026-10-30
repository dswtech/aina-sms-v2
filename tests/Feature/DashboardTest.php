<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_inactive_authenticated_users_are_logged_out(): void
    {
        $user = User::factory()->inactive()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors('username');
        $response->assertSessionDoesntHaveErrors('email');
        $this->assertGuest();
    }

    public function test_authenticated_user_props_use_a_safe_allowlist(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('auth.user', 7)
                ->where('auth.user.public_id', $user->public_id)
                ->where('auth.user.name', $user->name)
                ->where('auth.user.username', $user->username)
                ->where('auth.user.email', $user->email)
                ->where('auth.user.email_verified_at', $user->email_verified_at?->toISOString())
                ->where('auth.user.role', $user->role->value)
                ->where('auth.user.is_active', true)
                ->missing('auth.user.password')
                ->missing('auth.user.remember_token')
                ->missing('auth.user.supervisor_id'));
    }
}
