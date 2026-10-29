<?php

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\DevelopmentUserSeeder;
use Illuminate\Support\Facades\Hash;

it('seeds three supervisors with eight sales each', function () {
    $this->seed(DevelopmentUserSeeder::class);
    $this->seed(DevelopmentUserSeeder::class);

    $users = User::query()->get();
    $supervisors = $users->where('role', UserRole::Supervisor);

    expect($users)->toHaveCount(29)
        ->and($users->where('role', UserRole::Admin))->toHaveCount(1)
        ->and($users->where('role', UserRole::BranchManager))->toHaveCount(1)
        ->and($supervisors)->toHaveCount(3)
        ->and($users->where('role', UserRole::Sales))->toHaveCount(24)
        ->and($supervisors->pluck('username')->sort()->values()->all())
        ->toBe(['ariina', 'mayalest', 'rizkpran']);

    foreach ($supervisors as $supervisor) {
        expect($users->where('supervisor_id', $supervisor->id))->toHaveCount(8);
    }

    foreach ($users as $user) {
        expect($user->is_active)->toBeTrue()
            ->and(Hash::check('password', $user->password))->toBeTrue();
    }
});
