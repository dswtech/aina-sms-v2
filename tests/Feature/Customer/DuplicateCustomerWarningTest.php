<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Services\CustomerDuplicateDetector;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('detects existing customer with same normalized phone in the same dealer', function () {
    $dealer = Dealer::factory()->create();
    $otherDealer = Dealer::factory()->create();

    $existing = Customer::create([
        'dealer_id' => $dealer->id,
        'name' => 'Agus Pratama',
        'phone' => '0812-9988-7766',
    ]);

    $detector = new CustomerDuplicateDetector;

    // In same dealer, formatted differently
    $result = $detector->check($dealer->id, '6281299887766');
    expect($result->hasDuplicate)->toBeTrue()
        ->and($result->customer?->id)->toBe($existing->id);

    // In different dealer, should not flag duplicate
    $resultOther = $detector->check($otherDealer->id, '081299887766');
    expect($resultOther->hasDuplicate)->toBeFalse()
        ->and($resultOther->customer)->toBeNull();
});

it('returns no duplicate when phone does not match', function () {
    $dealer = Dealer::factory()->create();
    Customer::create([
        'dealer_id' => $dealer->id,
        'name' => 'Dewi Sartika',
        'phone' => '081122334455',
    ]);

    $detector = new CustomerDuplicateDetector;
    $result = $detector->check($dealer->id, '089988776655');

    expect($result->hasDuplicate)->toBeFalse()
        ->and($result->customer)->toBeNull();
});
