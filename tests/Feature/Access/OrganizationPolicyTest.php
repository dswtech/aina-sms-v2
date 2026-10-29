<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

function organizationActor(Dealer $dealer, UserRole $role, bool $active = true): User
{
    return User::factory()->role($role)->create([
        'dealer_id' => $dealer->id,
        'is_active' => $active,
    ]);
}

function placeInTeam(User $user, Team $team, UserRole $role, bool $ended = false): TeamMembership
{
    return TeamMembership::factory()->create([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'role' => $role,
        'ended_at' => $ended ? now() : null,
    ]);
}

it('limits user visibility to the authenticated organizational scope', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $otherTeam = Team::factory()->create(['dealer_id' => $dealer->id]);

    $admin = organizationActor($dealer, UserRole::Admin);
    $manager = organizationActor($dealer, UserRole::BranchManager);
    $supervisor = organizationActor($dealer, UserRole::Supervisor);
    $sales = organizationActor($dealer, UserRole::Sales);
    $otherSales = organizationActor($dealer, UserRole::Sales);
    $foreignSales = organizationActor($otherDealer, UserRole::Sales);

    placeInTeam($supervisor, $team, UserRole::Supervisor);
    placeInTeam($sales, $team, UserRole::Sales);
    placeInTeam($otherSales, $otherTeam, UserRole::Sales);

    expect(Gate::forUser($admin)->allows('view', $sales))->toBeTrue()
        ->and(Gate::forUser($manager)->denies('view', $sales))->toBeTrue()
        ->and(Gate::forUser($supervisor)->allows('view', $sales))->toBeTrue()
        ->and(Gate::forUser($supervisor)->denies('view', $otherSales))->toBeTrue()
        ->and(Gate::forUser($admin)->denies('view', $foreignSales))->toBeTrue()
        ->and(Gate::forUser($sales)->allows('view', $sales))->toBeTrue()
        ->and(Gate::forUser($sales)->denies('view', $otherSales))->toBeTrue();
});

it('requires active users and active memberships for scoped access', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $inactiveSupervisor = organizationActor($dealer, UserRole::Supervisor, false);
    $formerSupervisor = organizationActor($dealer, UserRole::Supervisor);
    $sales = organizationActor($dealer, UserRole::Sales);

    placeInTeam($inactiveSupervisor, $team, UserRole::Supervisor);
    placeInTeam($formerSupervisor, $team, UserRole::Supervisor, true);
    placeInTeam($sales, $team, UserRole::Sales);

    expect(Gate::forUser($inactiveSupervisor)->denies('view', $sales))->toBeTrue()
        ->and(Gate::forUser($formerSupervisor)->denies('view', $sales))->toBeTrue();
});

it('lets only same-dealer admins mutate organization records', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = organizationActor($dealer, UserRole::Sales);
    $membership = placeInTeam($sales, $team, UserRole::Sales);
    $admin = organizationActor($dealer, UserRole::Admin);
    $foreignAdmin = organizationActor($otherDealer, UserRole::Admin);
    $manager = organizationActor($dealer, UserRole::BranchManager);
    $supervisor = organizationActor($dealer, UserRole::Supervisor);

    placeInTeam($supervisor, $team, UserRole::Supervisor);

    expect(Gate::forUser($admin)->allows('update', $sales))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('update', $team))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('update', $membership))->toBeTrue()
        ->and(Gate::forUser($foreignAdmin)->denies('update', $sales))->toBeTrue()
        ->and(Gate::forUser($foreignAdmin)->denies('update', $team))->toBeTrue()
        ->and(Gate::forUser($manager)->denies('update', $sales))->toBeTrue()
        ->and(Gate::forUser($manager)->denies('update', $team))->toBeTrue()
        ->and(Gate::forUser($manager)->denies('view', $team))->toBeTrue()
        ->and(Gate::forUser($manager)->denies('view', $membership))->toBeTrue()
        ->and(Gate::forUser($supervisor)->denies('update', $membership))->toBeTrue();
});

it('derives visible queries from the actor and ignores caller supplied scope ids', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $otherTeam = Team::factory()->create(['dealer_id' => $dealer->id]);
    $foreignTeam = Team::factory()->create(['dealer_id' => $otherDealer->id]);
    $supervisor = organizationActor($dealer, UserRole::Supervisor);
    $sales = organizationActor($dealer, UserRole::Sales);
    $otherSales = organizationActor($dealer, UserRole::Sales);
    $foreignSales = organizationActor($otherDealer, UserRole::Sales);

    placeInTeam($supervisor, $team, UserRole::Supervisor);
    $membership = placeInTeam($sales, $team, UserRole::Sales);
    placeInTeam($otherSales, $otherTeam, UserRole::Sales);
    placeInTeam($foreignSales, $foreignTeam, UserRole::Sales);

    expect(User::query()->visibleTo($supervisor)->pluck('id')->all())
        ->toEqualCanonicalizing([$supervisor->id, $sales->id])
        ->not->toContain($foreignSales->id)
        ->and(User::query()->visibleTo($supervisor)->whereKey($foreignSales->id)->exists())
        ->toBeFalse()
        ->and(Team::query()->visibleTo($supervisor)->pluck('id')->all())
        ->toBe([$team->id])
        ->and(Team::query()->visibleTo($supervisor)->whereKey($foreignTeam->id)->exists())
        ->toBeFalse()
        ->and(TeamMembership::query()->visibleTo($supervisor)->pluck('id')->all())
        ->toContain($membership->id);
});

it('returns no organization rows for inactive actors', function () {
    $dealer = Dealer::factory()->create();
    $inactiveAdmin = organizationActor($dealer, UserRole::Admin, false);

    Team::factory()->create(['dealer_id' => $dealer->id]);
    organizationActor($dealer, UserRole::Sales);

    expect(User::query()->visibleTo($inactiveAdmin)->exists())->toBeFalse()
        ->and(Team::query()->visibleTo($inactiveAdmin)->exists())->toBeFalse()
        ->and(TeamMembership::query()->visibleTo($inactiveAdmin)->exists())->toBeFalse();
});
