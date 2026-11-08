<?php

namespace Tests\Feature\Auth;

use App\Http\Responses\NeutralPasswordResetLinkResponse;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::resetPasswords());
    }

    public function test_reset_password_link_screen_can_be_rendered()
    {
        $response = $this->get(route('password.request'));

        $response->assertOk();
    }

    public function test_reset_password_link_can_be_requested()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_unknown_email_gets_the_same_neutral_response_as_a_known_email()
    {
        Notification::fake();

        $user = User::factory()->create();

        foreach ([$user->email, 'nobody@example.test'] as $email) {
            $this->post(route('password.email'), ['email' => $email])
                ->assertSessionHasNoErrors()
                ->assertSessionHas('status', NeutralPasswordResetLinkResponse::MESSAGE);
        }

        Notification::assertCount(1);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_throttled_request_for_a_known_email_is_not_distinguishable()
    {
        Notification::fake();

        $user = User::factory()->create();

        foreach ([1, 2] as $attempt) {
            $this->post(route('password.email'), ['email' => $user->email])
                ->assertSessionHasNoErrors()
                ->assertSessionHas('status', NeutralPasswordResetLinkResponse::MESSAGE);
        }
    }

    public function test_reset_email_is_in_indonesian_with_a_reset_link_and_expiry()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $mail = $notification->toMail($user);

            $this->assertSame('Atur ulang password', $mail->subject);
            $this->assertStringContainsString('/reset-password/'.$notification->token, $mail->actionUrl);
            $this->assertStringContainsString(rawurlencode($user->email), $mail->actionUrl);
            $this->assertStringContainsString('60 menit', implode(' ', $mail->outroLines));

            return true;
        });
    }

    public function test_reset_password_screen_can_be_rendered()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
            $response = $this->get(route('password.reset', $notification->token));

            $response->assertOk();

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->post(route('password.update'), [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertSessionHasErrors('email');
    }
}
