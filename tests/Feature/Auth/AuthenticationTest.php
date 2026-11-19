<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get(route('login'));

        $response->assertOk();
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'username' => $user->username,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $this->useProductionLocale();
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'username' => $user->username,
            'password' => 'wrong-password',
        ])->assertSessionHasErrors(['username' => 'Username atau password salah.']);

        $this->assertGuest();
    }

    public function test_auth_messages_have_indonesian_text(): void
    {
        // A missing lang file shows the raw key (e.g. "auth.failed") to users.
        $this->useProductionLocale();
        foreach (['auth.failed', 'auth.throttle', 'passwords.reset', 'passwords.token', 'passwords.user', 'validation.current_password'] as $key) {
            $this->assertNotSame($key, __($key), "Missing Indonesian text for {$key}");
        }
    }

    /** Production runs locale and fallback "id"; local .env may say "en", which hides missing keys. */
    private function useProductionLocale(): void
    {
        app()->setLocale('id');
        app('translator')->setFallback('id');
    }

    public function test_array_username_is_rejected_without_server_error(): void
    {
        $this->post(route('login.store'), [
            'username' => ['admin'],
            'password' => 'password',
        ])->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_inactive_users_can_not_authenticate(): void
    {
        $user = User::factory()->inactive()->create();

        $response = $this->post(route('login.store'), [
            'username' => $user->username,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('username');
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('logout'));

        $response->assertRedirect(route('home'));

        $this->assertGuest();
    }

    public function test_users_are_rate_limited()
    {
        $user = User::factory()->create();

        RateLimiter::increment(md5('login'.implode('|', [$user->username, '127.0.0.1'])), amount: 5);

        $response = $this->post(route('login.store'), [
            'username' => $user->username,
            'password' => 'wrong-password',
        ]);

        $response->assertTooManyRequests();
    }

    public function test_one_ip_cannot_try_unlimited_usernames(): void
    {
        foreach (range(1, 60) as $attempt) {
            $this->post(route('login.store'), [
                'username' => 'nobody-'.$attempt,
                'password' => 'wrong-password',
            ])->assertSessionHasErrors('username');
        }

        $this->post(route('login.store'), [
            'username' => 'nobody-61',
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }

    public function test_unknown_username_still_spends_a_password_hash(): void
    {
        Hash::partialMock()->shouldReceive('make')->once()->andReturn('hash');

        $this->post(route('login.store'), [
            'username' => 'nobody',
            'password' => 'whatever',
        ])->assertSessionHasErrors('username');
    }
}
