<?php

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationCreated;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

it('lists only users and invitations in the admin dealer', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $active = User::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Active User']);
    $inactive = User::factory()->inactive()->create(['dealer_id' => $dealer->id, 'name' => 'Inactive User']);
    User::factory()->create(['dealer_id' => $otherDealer->id, 'name' => 'Foreign User']);
    Invitation::factory()->create([
        'dealer_id' => $dealer->id,
        'invited_by_id' => $admin->id,
        'name' => 'Invited User',
    ]);
    $foreignAdmin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $otherDealer->id]);
    Invitation::factory()->create([
        'dealer_id' => $otherDealer->id,
        'invited_by_id' => $foreignAdmin->id,
        'name' => 'Foreign Invite',
    ]);

    $this->actingAs($admin)->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->has('users', 3)
            ->has('invitations', 1)
            ->where('users.1.name', $active->name)
            ->where('users.2.name', $inactive->name)
            ->where('invitations.0.name', 'Invited User'));
});

it('filters the lifecycle list by status and query', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    User::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Budi Active']);
    User::factory()->inactive()->create(['dealer_id' => $dealer->id, 'name' => 'Budi Inactive']);
    Invitation::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Budi Invited']);

    $this->actingAs($admin)->get(route('users.index', ['status' => 'inactive', 'q' => 'Budi']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users', 1)
            ->where('users.0.name', 'Budi Inactive')
            ->has('invitations', 0)
            ->where('filters.status', 'inactive')
            ->where('filters.q', 'Budi'));
});

it('resends and revokes a pending same-dealer invitation with audit records', function () {
    Notification::fake();
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $invitation = Invitation::factory()->create(['dealer_id' => $dealer->id]);
    $oldHash = $invitation->token_hash;

    $this->actingAs($admin)->post(route('invitations.resend', $invitation))->assertRedirect();

    expect($invitation->fresh()->token_hash)->not->toBe($oldHash)
        ->and($invitation->fresh()->expires_at->isFuture())->toBeTrue();
    Notification::assertSentOnDemand(InvitationCreated::class);

    $this->actingAs($admin)->patch(route('invitations.revoke', $invitation))->assertRedirect();

    expect($invitation->fresh()->revoked_at)->not->toBeNull()
        ->and(AuditLog::query()->where('action', 'invitation.resent')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'invitation.revoked')->exists())->toBeTrue();
});

it('deactivates and reactivates a same-dealer user without deleting history', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $user = User::factory()->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->patch(route('users.status', $user), ['is_active' => false])->assertRedirect();
    expect($user->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)->patch(route('users.status', $user), ['is_active' => true])->assertRedirect();

    expect($user->fresh()->is_active)->toBeTrue()
        ->and(User::query()->whereKey($user->id)->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'user.deactivated')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'user.reactivated')->exists())->toBeTrue();
});

it('forbids non-admins cross-dealer records terminal invitations and self deactivation', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->role(UserRole::Supervisor)->create(['dealer_id' => $dealer->id]);
    $foreignUser = User::factory()->create(['dealer_id' => $otherDealer->id]);
    $foreignInvitation = Invitation::factory()->create(['dealer_id' => $otherDealer->id]);
    $usedInvitation = Invitation::factory()->create(['dealer_id' => $dealer->id, 'accepted_at' => now()]);

    $this->actingAs($supervisor)->get(route('users.index'))->assertForbidden();
    $this->actingAs($supervisor)->patch(route('users.status', $admin), ['is_active' => false])->assertForbidden();
    $this->actingAs($admin)->patch(route('users.status', $admin), ['is_active' => false])->assertSessionHasErrors('user');
    $this->actingAs($admin)->patch(route('users.status', $foreignUser), ['is_active' => false])->assertForbidden();
    $this->actingAs($admin)->post(route('invitations.resend', $foreignInvitation))->assertForbidden();
    $this->actingAs($admin)->post(route('invitations.resend', $usedInvitation))->assertSessionHasErrors('invitation');
});
