<?php

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a deal transaction for a customer with initial stage Lead', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Stargazer Prime',
        'estimated_value' => 320000000,
        'source' => 'walk_in',
        'current_stage' => PipelineStage::Lead,
    ]);

    expect($deal->id)->not->toBeNull()
        ->and($deal->public_id)->not->toBeNull()
        ->and($deal->current_stage)->toBe(PipelineStage::Lead)
        ->and($deal->customer->id)->toBe($customer->id)
        ->and($deal->sales->id)->toBe($sales->id)
        ->and($deal->is_stagnant)->toBeFalse();
});

it('calculates stagnant status when active deal has no activity for more than 3 days', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $activeDeal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta IVT',
        'current_stage' => PipelineStage::Prospect,
        'last_activity_at' => now()->subDays(4),
    ]);

    expect($activeDeal->is_stagnant)->toBeTrue();

    // Closed deals (Delivery / Lost) should never be flagged stagnant
    $activeDeal->current_stage = PipelineStage::Delivery;
    expect($activeDeal->is_stagnant)->toBeFalse();

    $activeDeal->current_stage = PipelineStage::Lost;
    $activeDeal->lost_reason = LostReason::Competitor;
    expect($activeDeal->is_stagnant)->toBeFalse();
});
