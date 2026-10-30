<?php

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

it('lists only teams and assignable people in the admin dealer', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $team = Team::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Tim Utama']);
    Team::factory()->create(['dealer_id' => $otherDealer->id, 'name' => 'Tim Asing']);
    $sales = User::factory()->role(UserRole::Sales)->create(['dealer_id' => $dealer->id, 'name' => 'Sales Lokal']);
    User::factory()->role(UserRole::Sales)->create(['dealer_id' => $otherDealer->id, 'name' => 'Sales Asing']);
    TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id]);

    $this->actingAs($admin)->get(route('teams.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/teams/index')
            ->has('teams', 1)
            ->where('teams.0.name', 'Tim Utama')
            ->has('people', 1)
            ->where('people.0.name', 'Sales Lokal')
            ->where('people.0.team_id', $team->public_id));
});

it('creates renames and deactivates a team while closing active memberships', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->post(route('teams.store'), ['name' => 'Tim Baru'])->assertRedirect();
    $team = Team::query()->where('name', 'Tim Baru')->sole();

    $this->actingAs($admin)->patch(route('teams.update', $team), ['name' => 'Tim Andalan'])->assertRedirect();
    expect($team->fresh()->name)->toBe('Tim Andalan');

    $sales = User::factory()->role(UserRole::Sales)->create(['dealer_id' => $dealer->id]);
    $membership = TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id]);
    $invitation = Invitation::factory()->create([
        'dealer_id' => $dealer->id,
        'team_id' => $team->id,
        'invited_by_id' => $admin->id,
        'role' => UserRole::Sales,
    ]);

    $this->actingAs($admin)->patch(route('teams.update', $team), ['is_active' => false])->assertRedirect();

    expect($team->fresh()->is_active)->toBeFalse()
        ->and($membership->fresh()->ended_at)->not->toBeNull()
        ->and($invitation->fresh()->revoked_at)->not->toBeNull()
        ->and(AuditLog::query()->where('action', 'team.created')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'team.updated')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'team.deactivated')->exists())->toBeTrue();
});

it('assigns reassigns and closes membership while preserving history', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $firstTeam = Team::factory()->create(['dealer_id' => $dealer->id]);
    $secondTeam = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->role(UserRole::Sales)->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->post(route('team-memberships.store'), [
        'user_id' => $sales->public_id,
        'team_id' => $firstTeam->public_id,
    ])->assertRedirect();

    $firstMembership = $sales->activeTeamMemberships()->sole();

    $this->actingAs($admin)->post(route('team-memberships.store'), [
        'user_id' => $sales->public_id,
        'team_id' => $secondTeam->public_id,
    ])->assertRedirect();

    expect($firstMembership->fresh()->ended_at)->not->toBeNull()
        ->and($sales->activeTeamMemberships()->sole()->team_id)->toBe($secondTeam->id)
        ->and($sales->teamMemberships()->count())->toBe(2);

    $this->actingAs($admin)->delete(route('team-memberships.destroy', $sales))->assertRedirect();

    expect($sales->activeTeamMemberships()->exists())->toBeFalse()
        ->and($sales->teamMemberships()->count())->toBe(2)
        ->and(AuditLog::query()->where('action', 'membership.reassigned')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('action', 'membership.ended')->exists())->toBeTrue();
});

it('rejects inactive teams foreign records invalid roles and non-admin actors', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->role(UserRole::Supervisor)->create(['dealer_id' => $dealer->id]);
    $inactiveTeam = Team::factory()->inactive()->create(['dealer_id' => $dealer->id]);
    $foreignTeam = Team::factory()->create(['dealer_id' => $otherDealer->id]);
    $sales = User::factory()->role(UserRole::Sales)->create(['dealer_id' => $dealer->id]);
    $manager = User::factory()->role(UserRole::BranchManager)->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->post(route('team-memberships.store'), [
        'user_id' => $sales->public_id,
        'team_id' => $inactiveTeam->public_id,
    ])->assertSessionHasErrors('team_id');
    $this->actingAs($admin)->post(route('team-memberships.store'), [
        'user_id' => $sales->public_id,
        'team_id' => $foreignTeam->public_id,
    ])->assertSessionHasErrors('team_id');
    $this->actingAs($admin)->post(route('team-memberships.store'), [
        'user_id' => $manager->public_id,
        'team_id' => $foreignTeam->public_id,
    ])->assertSessionHasErrors(['user_id', 'team_id']);
    $this->actingAs($supervisor)->post(route('teams.store'), ['name' => 'Tidak Boleh'])->assertForbidden();

    expect(TeamMembership::query()->exists())->toBeFalse();
});
