<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationCreated;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;

function firstAdminOptions(array $overrides = []): array
{
    return array_merge([
        '--dealer' => 'Pilot Dealer',
        '--name' => 'Pilot Owner',
        '--email' => 'owner@example.test',
        '--username' => 'pilotowner',
        '--force' => true,
    ], $overrides);
}

it('bootstraps only an invitation and lets its owner set the first admin password once', function () {
    Notification::fake();
    $token = null;
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertSuccessful();

    Notification::assertSentOnDemand(InvitationCreated::class, function (InvitationCreated $notification) use (&$token): bool {
        $token = $notification->plainToken;

        return true;
    });

    $invitation = Invitation::query()->sole();
    expect(User::query()->count())->toBe(0)
        ->and(Dealer::query()->sole()->name)->toBe('Pilot Dealer')
        ->and($invitation->invited_by_id)->toBeNull()
        ->and($invitation->role)->toBe(UserRole::Admin)
        ->and($invitation->team_id)->toBeNull()
        ->and($invitation->token_hash)->toBe(hash('sha256', $token));
    expect(Artisan::output())->not->toContain($token, $invitation->token_hash);

    $this->post(route('invitations.accept', $token), [
        'password' => 'OwnerChosen123!',
        'password_confirmation' => 'OwnerChosen123!',
    ])->assertRedirect(route('login'));
    expect(User::query()->sole()->role)->toBe(UserRole::Admin);

    $this->post(route('invitations.accept', $token), [
        'password' => 'OwnerChosen123!',
        'password_confirmation' => 'OwnerChosen123!',
    ])->assertSessionHasErrors('invitation');
});

it('refuses to replace even an inactive admin', function () {
    Notification::fake();
    User::factory()->role(UserRole::Admin)->inactive()->create();
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertFailed();
    expect(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
});

it('normalizes a mixed-case owner username so activation permits normal login', function () {
    Notification::fake();
    $token = null;
    $this->artisan('app:invite-first-admin', firstAdminOptions(['--username' => ' PilotOwner ']))->assertSuccessful();
    Notification::assertSentOnDemand(InvitationCreated::class, function (InvitationCreated $notification) use (&$token): bool {
        $token = $notification->plainToken;

        return true;
    });

    expect(Invitation::query()->sole()->username)->toBe('pilotowner');
    $this->post(route('invitations.accept', $token), [
        'password' => 'OwnerChosen123!',
        'password_confirmation' => 'OwnerChosen123!',
    ])->assertRedirect(route('login'));
    expect(User::query()->sole()->username)->toBe('pilotowner');

    $this->post(route('login.store'), [
        'username' => 'PilotOwner',
        'password' => 'OwnerChosen123!',
    ])->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticatedAs(User::query()->sole());
});

it('blocks a second active invitation but permits a fresh invitation after expiry', function () {
    Notification::fake();
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertSuccessful();
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertFailed();
    expect(Invitation::query()->count())->toBe(1);

    Invitation::query()->update(['expires_at' => now()->subMinute()]);
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertSuccessful();
    expect(Invitation::query()->count())->toBe(2)
        ->and(Dealer::query()->count())->toBe(1);
});

it('rolls back failed delivery so a safe rerun can succeed', function () {
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('sensitive transport detail'));
    $this->artisan('app:invite-first-admin', firstAdminOptions())
        ->doesntExpectOutputToContain('sensitive transport detail')->assertFailed();
    expect(Invitation::query()->count())->toBe(0)
        ->and(Dealer::query()->count())->toBe(0);

    Notification::fake();
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertSuccessful();
});

it('reports only a safe SMTP status when delivery fails', function () {
    Notification::shouldReceive('send')->once()
        ->andThrow(new RuntimeException('Failed to authenticate with PRIVATE_KEY; got code "525"'));
    $this->artisan('app:invite-first-admin', firstAdminOptions())
        ->expectsOutputToContain('Bootstrap diagnostic: SMTP status 525')
        ->doesntExpectOutputToContain('PRIVATE_KEY')->assertFailed();
    expect(Invitation::query()->count())->toBe(0);
});

it('reports a database SQLSTATE without exposing its query or credentials', function () {
    Notification::shouldReceive('send')->once()
        ->andThrow(new RuntimeException('PRIVATE_QUERY_WITH_SECRET', 42501));
    $this->artisan('app:invite-first-admin', firstAdminOptions())
        ->expectsOutputToContain('Bootstrap diagnostic: error code 42501')
        ->doesntExpectOutputToContain('PRIVATE_QUERY_WITH_SECRET')->assertFailed();
});

it('validates required owner inputs before creating any data', function (array $overrides) {
    Notification::fake();
    $this->artisan('app:invite-first-admin', firstAdminOptions($overrides))->assertFailed();
    expect(Dealer::query()->count())->toBe(0)->and(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
})->with([
    [['--dealer' => '']],
    [['--name' => '']],
    [['--email' => 'invalid']],
    [['--username' => 'contains spaces']],
    [['--username' => 'toolongusername']],
]);

it('requires confirmation in production and does not write after refusal', function () {
    Notification::fake();
    app()->instance('env', 'production');
    config(['mail.default' => 'smtp']);
    $this->artisan('app:invite-first-admin', firstAdminOptions(['--force' => false]))
        ->expectsConfirmation('Send the first Admin invitation to the specified owner?', 'no')
        ->assertFailed();
    expect(Dealer::query()->count())->toBe(0);
    Notification::assertNothingSent();
});

it('refuses logging and fallback mail transports outside tests', function (string $mailer) {
    Notification::fake();
    app()->instance('env', 'production');
    config(['mail.default' => $mailer]);
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertFailed();
    expect(Dealer::query()->count())->toBe(0);
    Notification::assertNothingSent();
})->with(['log', 'array', 'failover']);

it('does not silently rename or create a second dealer', function () {
    Notification::fake();
    Dealer::factory()->create(['name' => 'Existing Dealer']);
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertFailed();
    expect(Dealer::query()->count())->toBe(1)->and(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
});

it('refuses an owner identity that already belongs to another role', function (array $identity) {
    Notification::fake();
    $dealer = Dealer::factory()->create(['name' => 'Pilot Dealer']);
    User::factory()->role(UserRole::Sales)->create(array_merge(['dealer_id' => $dealer->id], $identity));
    $this->artisan('app:invite-first-admin', firstAdminOptions())->assertFailed();
    expect(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
})->with([
    [['email' => 'owner@example.test']],
    [['username' => 'pilotowner']],
]);
