<?php

use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('sends security headers on web responses', function () {
    $dealer = Dealer::factory()->create();
    $user = User::factory()->admin()->create(['dealer_id' => $dealer->id]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

it('exposes laravel health endpoint', function () {
    $this->get('/up')->assertOk();
});
