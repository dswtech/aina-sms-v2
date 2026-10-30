<?php

use App\Models\User;

it('redirects guests from the root page to login', function () {
    $this->get('/')
        ->assertRedirect(route('login', absolute: false));
});

it('redirects authenticated users from the root page to dashboard', function () {
    $this->actingAs(User::factory()->create())
        ->get('/')
        ->assertRedirect(route('dashboard', absolute: false));
});
