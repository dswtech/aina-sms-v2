<?php

use App\Enums\UserRole;
use App\Models\User;
use App\Support\Releases;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->withoutVite());

it('shows the release log to every role', function (UserRole $role) {
    $this->actingAs(User::factory()->role($role)->create())->get(route('releases.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('releases/index')
            ->has('releases', count(Releases::all()))
            ->has('releases.0', fn (Assert $release) => $release
                ->hasAll(['version', 'date', 'items'])
                ->missing('notify')->missing('summary'))
            ->where('appVersion', Releases::current()['version']));
})->with([
    'sales' => UserRole::Sales,
    'supervisor' => UserRole::Supervisor,
    'branch manager' => UserRole::BranchManager,
    'admin' => UserRole::Admin,
]);

it('redirects guests to login', function () {
    $this->get(route('releases.index'))->assertRedirect(route('login'));
});
