<?php

use App\Models\User;

it('sends a user home instead of to a remembered page their role cannot open', function () {
    $sales = User::factory()->sales()->create();
    $this->get('/dealer-settings/vehicles')->assertRedirect(route('login'));

    $this->post(route('login.store'), ['username' => $sales->username, 'password' => 'password'])
        ->assertRedirect(route('dashboard', absolute: false));
});

it('still returns a user to a remembered page their role can open', function () {
    $sales = User::factory()->sales()->create();
    $this->get('/kalender?view=day')->assertRedirect(route('login'));

    $this->post(route('login.store'), ['username' => $sales->username, 'password' => 'password'])
        ->assertRedirect(url('/kalender?view=day'));

    $admin = User::factory()->admin()->create();
    auth()->logout();
    $this->get('/dealer-settings/vehicles');
    $this->post(route('login.store'), ['username' => $admin->username, 'password' => 'password'])
        ->assertRedirect(url('/dealer-settings/vehicles'));
});
