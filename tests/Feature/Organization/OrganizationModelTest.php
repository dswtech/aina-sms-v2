<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Support\Str;

it('provides organization models', function () {
    expect(class_exists(Dealer::class))->toBeTrue()
        ->and(class_exists(Team::class))->toBeTrue()
        ->and(class_exists(TeamMembership::class))->toBeTrue();
});

it('relates a dealer to teams and users', function () {
    $dealer = Dealer::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'name' => 'Dealer AINA',
        'timezone' => 'Asia/Jakarta',
        'is_active' => true,
    ]);
    $team = Team::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'dealer_id' => $dealer->id,
        'name' => 'Tim Utara',
        'is_active' => true,
    ]);
    $user = User::factory()->create(['dealer_id' => $dealer->id]);

    expect($dealer->teams->modelKeys())->toBe([$team->id])
        ->and($dealer->users->modelKeys())->toBe([$user->id])
        ->and($team->dealer->is($dealer))->toBeTrue()
        ->and($user->dealer->is($dealer))->toBeTrue();
});

it('keeps membership history and exposes only active placements', function () {
    $dealer = Dealer::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'name' => 'Dealer AINA',
        'timezone' => 'Asia/Jakarta',
        'is_active' => true,
    ]);
    $team = Team::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'dealer_id' => $dealer->id,
        'name' => 'Tim Utara',
        'is_active' => true,
    ]);
    $admin = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->role(UserRole::Sales)->create(['dealer_id' => $dealer->id]);

    $ended = TeamMembership::query()->forceCreate([
        'team_id' => $team->id,
        'user_id' => $sales->id,
        'role' => UserRole::Sales,
        'assigned_by_id' => $admin->id,
        'started_at' => now()->subMonth(),
        'ended_at' => now()->subDay(),
    ]);
    $active = TeamMembership::query()->forceCreate([
        'team_id' => $team->id,
        'user_id' => $sales->id,
        'role' => UserRole::Sales,
        'assigned_by_id' => $admin->id,
        'started_at' => now(),
        'ended_at' => null,
    ]);

    expect($team->memberships)->toHaveCount(2)
        ->and($team->activeMemberships->modelKeys())->toBe([$active->id])
        ->and($sales->teamMemberships)->toHaveCount(2)
        ->and($sales->activeTeamMemberships->modelKeys())->toBe([$active->id])
        ->and($active->role)->toBe(UserRole::Sales)
        ->and($active->assignedBy->is($admin))->toBeTrue()
        ->and($ended->ended_at)->not->toBeNull();
});

it('filters active teams', function () {
    $dealer = Dealer::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'name' => 'Dealer AINA',
        'timezone' => 'Asia/Jakarta',
        'is_active' => true,
    ]);
    $active = Team::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'dealer_id' => $dealer->id,
        'name' => 'Tim Aktif',
        'is_active' => true,
    ]);
    Team::query()->forceCreate([
        'public_id' => (string) Str::uuid(),
        'dealer_id' => $dealer->id,
        'name' => 'Tim Nonaktif',
        'is_active' => false,
    ]);

    expect(Team::query()->active()->pluck('id')->all())->toBe([$active->id]);
});

it('builds organization fixtures with explicit active and ended states', function () {
    $dealer = Dealer::factory()->create();
    $inactiveTeam = Team::factory()->for($dealer)->inactive()->create();
    $endedMembership = TeamMembership::factory()
        ->for($inactiveTeam)
        ->ended()
        ->create();

    expect($dealer->is_active)->toBeTrue()
        ->and($inactiveTeam->is_active)->toBeFalse()
        ->and($endedMembership->ended_at)->not->toBeNull()
        ->and($endedMembership->user->dealer_id)->toBe($dealer->id);
});
