<?php

use App\Enums\UserRole;
use App\Models\User;

dataset('role route access', [
    'sales' => [
        UserRole::Sales,
        ['/dashboard', '/customers', '/transactions', '/notifications', '/rilis', '/kalender'],
        ['/team-performance', '/targets', '/analytics', '/imports', '/users', '/teams', '/dealer-settings', '/dealer-settings/leasing', '/dealer-settings/vehicles'],
    ],
    'supervisor' => [
        UserRole::Supervisor,
        ['/dashboard', '/customers', '/transactions', '/targets', '/analytics', '/imports', '/notifications', '/rilis', '/kalender'],
        ['/team-performance', '/users', '/teams', '/dealer-settings'],
    ],
    'branch manager' => [
        UserRole::BranchManager,
        ['/dashboard', '/team-performance', '/analytics', '/notifications', '/rilis'],
        ['/customers', '/transactions', '/targets', '/imports', '/users', '/teams', '/dealer-settings', '/kalender'],
    ],
    'admin' => [
        UserRole::Admin,
        ['/dashboard', '/customers', '/transactions', '/users', '/teams', '/analytics', '/imports', '/dealer-settings', '/dealer-settings/leasing', '/dealer-settings/vehicles', '/notifications', '/rilis', '/targets'],
        ['/team-performance', '/kalender'],
    ],
]);

it('enforces the server route scope for each role', function (
    UserRole $role,
    array $allowed,
    array $denied,
) {
    $user = User::factory()->role($role)->create();
    $this->withoutVite();

    foreach ($allowed as $path) {
        $this->actingAs($user)->get($path)->assertOk();
    }

    foreach ($denied as $path) {
        $this->actingAs($user)->get($path)->assertForbidden();
    }
})->with('role route access');
