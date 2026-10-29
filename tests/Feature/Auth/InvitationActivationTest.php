<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Notifications\InvitationCreated;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function inviteAdmin(Dealer $dealer): User
{
    return User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
}

function invitationPayload(Team $team, array $overrides = []): array
{
    return array_merge([
        'name' => 'Sari Wulandari',
        'email' => 'sari@example.test',
        'role' => UserRole::Sales->value,
        'team_id' => $team->id,
    ], $overrides);
}

it('lets a same-dealer admin create and deliver a hashed single-use invitation', function () {
    Notification::fake();
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $admin = inviteAdmin($dealer);
    $plainToken = null;

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($team))
        ->assertRedirect();

    $invitation = Invitation::query()->sole();

    Notification::assertSentOnDemand(
        InvitationCreated::class,
        function (InvitationCreated $notification) use (&$plainToken): bool {
            $plainToken = $notification->plainToken;

            return true;
        },
    );

    expect($invitation->dealer_id)->toBe($dealer->id)
        ->and($invitation->team_id)->toBe($team->id)
        ->and($invitation->role)->toBe(UserRole::Sales)
        ->and($plainToken)->toBeString()->not->toBe('')
        ->and($invitation->token_hash)->toBe(hash('sha256', $plainToken))
        ->and($invitation->getAttributes())->not->toHaveKeys(['password', 'plain_token']);
});

it('rejects non-admin creation and caller supplied organization scope', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $foreignTeam = Team::factory()->create(['dealer_id' => $otherDealer->id]);
    $supervisor = User::factory()->role(UserRole::Supervisor)->create(['dealer_id' => $dealer->id]);
    $admin = inviteAdmin($dealer);

    $this->actingAs($supervisor)
        ->post(route('invitations.store'), invitationPayload($team))
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($foreignTeam, [
            'dealer_id' => $otherDealer->id,
        ]))
        ->assertSessionHasErrors('team_id');

    expect(Invitation::query()->exists())->toBeFalse();
});

it('validates role and team combinations', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $admin = inviteAdmin($dealer);

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($team, ['team_id' => null]))
        ->assertSessionHasErrors('team_id');

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($team, [
            'role' => UserRole::BranchManager->value,
        ]))
        ->assertSessionHasErrors('team_id');

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($team, ['role' => 'owner']))
        ->assertSessionHasErrors('role');

    User::factory()->create([
        'dealer_id' => $dealer->id,
        'email' => 'existing@example.test',
    ]);

    $this->actingAs($admin)
        ->post(route('invitations.store'), invitationPayload($team, [
            'email' => 'EXISTING@EXAMPLE.TEST',
        ]))
        ->assertSessionHasErrors('email');
});

it('shows valid invitation details and activates the account atomically', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $plainToken = Str::random(64);
    $invitation = Invitation::factory()->create([
        'dealer_id' => $dealer->id,
        'team_id' => $team->id,
        'role' => UserRole::Sales,
        'email' => 'new.sales@example.test',
        'username' => 'newsales',
        'token_hash' => hash('sha256', $plainToken),
    ]);

    $this->get(route('invitations.show', $plainToken))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/activate-invitation')
            ->where('state', 'valid')
            ->where('invitation.email', 'new.sales@example.test')
            ->where('invitation.username', 'newsales'));

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertRedirect(route('login'));

    $user = User::query()->where('email', 'new.sales@example.test')->sole();

    expect($user->dealer_id)->toBe($dealer->id)
        ->and($user->username)->toBe('newsales')
        ->and($user->role)->toBe(UserRole::Sales)
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->activeTeamMemberships()->where('team_id', $team->id)->exists())->toBeTrue()
        ->and($invitation->fresh()->accepted_at)->not->toBeNull();

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'AnotherPassword123!',
        'password_confirmation' => 'AnotherPassword123!',
    ])->assertSessionHasErrors('invitation');

    expect(User::query()->where('email', 'new.sales@example.test')->count())->toBe(1);
});

it('rolls back activation when the assigned team is no longer active', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->inactive()->create(['dealer_id' => $dealer->id]);
    $plainToken = Str::random(64);
    $invitation = Invitation::factory()->create([
        'dealer_id' => $dealer->id,
        'team_id' => $team->id,
        'role' => UserRole::Sales,
        'email' => 'blocked.sales@example.test',
        'username' => 'blockedsales',
        'token_hash' => hash('sha256', $plainToken),
    ]);

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertSessionHasErrors('invitation');

    expect(User::query()->where('email', $invitation->email)->exists())->toBeFalse()
        ->and($invitation->fresh()->accepted_at)->toBeNull();
});

it('renders safe terminal states and rejects expired revoked and used tokens', function (string $state, array $attributes) {
    $plainToken = Str::random(64);
    $invitation = Invitation::factory()->create(array_merge([
        'token_hash' => hash('sha256', $plainToken),
    ], $attributes));

    $this->get(route('invitations.show', $plainToken))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/activate-invitation')
            ->where('state', $state)
            ->missing('invitation.email'));

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertSessionHasErrors('invitation');

    expect($invitation->fresh()->accepted_at !== null)->toBe($state === 'used');
})->with([
    'expired' => ['expired', ['expires_at' => now()->subMinute()]],
    'revoked' => ['revoked', ['revoked_at' => now()]],
    'used' => ['used', ['accepted_at' => now()]],
]);

it('rejects unknown tokens without leaking invitation data', function () {
    $this->get(route('invitations.show', Str::random(64)))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/activate-invitation')
            ->where('state', 'invalid')
            ->missing('invitation'));
});

it('does not reactivate an existing inactive target', function () {
    $dealer = Dealer::factory()->create();
    $plainToken = Str::random(64);
    $invitation = Invitation::factory()->create([
        'dealer_id' => $dealer->id,
        'email' => 'inactive@example.test',
        'username' => 'inactiveusr',
        'token_hash' => hash('sha256', $plainToken),
    ]);
    User::factory()->inactive()->create([
        'dealer_id' => $dealer->id,
        'email' => $invitation->email,
        'username' => $invitation->username,
    ]);

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertSessionHasErrors('invitation');

    expect($invitation->fresh()->accepted_at)->toBeNull()
        ->and(User::query()->where('email', $invitation->email)->sole()->is_active)->toBeFalse();
});
