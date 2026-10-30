<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Database\Seeders\DevelopmentUserSeeder;
use Illuminate\Support\Facades\Hash;

it('seeds three supervisors with eight sales each', function () {
    $this->seed(DevelopmentUserSeeder::class);
    $this->seed(DevelopmentUserSeeder::class);

    $users = User::query()->get();
    $supervisors = $users->where('role', UserRole::Supervisor);
    $dealer = Dealer::query()->sole();
    $teams = Team::query()->with('activeMemberships')->get();
    $memberships = TeamMembership::query()->active()->get();

    expect($users)->toHaveCount(29)
        ->and(Dealer::query()->count())->toBe(1)
        ->and($teams)->toHaveCount(3)
        ->and($memberships)->toHaveCount(27)
        ->and($users->where('role', UserRole::Admin))->toHaveCount(1)
        ->and($users->where('role', UserRole::BranchManager))->toHaveCount(1)
        ->and($supervisors)->toHaveCount(3)
        ->and($users->where('role', UserRole::Sales))->toHaveCount(24)
        ->and($supervisors->pluck('username')->sort()->values()->all())
        ->toBe(['ariina', 'mayalest', 'rizkpran'])
        ->and($users->pluck('dealer_id')->unique()->values()->all())->toBe([$dealer->id])
        ->and($users->whereNotNull('supervisor_id'))->toHaveCount(0);

    foreach ($teams as $team) {
        expect($team->activeMemberships->where('role', UserRole::Supervisor))->toHaveCount(1)
            ->and($team->activeMemberships->where('role', UserRole::Sales))->toHaveCount(8);
    }

    foreach ($users as $user) {
        expect($user->is_active)->toBeTrue()
            ->and(Hash::check('password', $user->password))->toBeTrue();
    }
});
