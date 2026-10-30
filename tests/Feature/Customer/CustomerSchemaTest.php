<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a customer with required attributes and casts', function () {
    $dealer = Dealer::factory()->create();
    $user = User::factory()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::create([
        'dealer_id' => $dealer->id,
        'created_by_id' => $user->id,
        'name' => 'Budi Santoso',
        'phone' => '081234567890',
        'email' => 'budi@example.com',
        'address' => 'Jl. Sudirman No. 12, Jakarta',
        'contact_channel_preference' => 'whatsapp',
        'opt_out' => false,
        'notes' => 'Minat SUV keluarga',
    ]);

    expect($customer->id)->not->toBeNull()
        ->and($customer->public_id)->not->toBeNull()
        ->and($customer->phone)->toBe('+6281234567890')
        ->and($customer->opt_out)->toBeFalse()
        ->and($customer->dealer->id)->toBe($dealer->id)
        ->and($customer->createdBy->id)->toBe($user->id);
});

it('supports opt_out and channel preferences', function () {
    $dealer = Dealer::factory()->create();

    $customer = Customer::create([
        'dealer_id' => $dealer->id,
        'name' => 'Citra Lestari',
        'phone' => '+6289876543210',
        'opt_out' => true,
        'contact_channel_preference' => 'phone',
    ]);

    expect($customer->opt_out)->toBeTrue()
        ->and($customer->contact_channel_preference)->toBe('phone');
});
