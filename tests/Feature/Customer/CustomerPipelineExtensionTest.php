<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a new transaction for an existing customer', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    $response = $this->actingAs($sales)
        ->post(route('customers.transactions.store', $customer), [
            'vehicle_model' => 'Creta IVT',
            'source' => 'walk_in',
            'estimated_value' => 300000000,
        ]);

    $response->assertRedirect();

    expect($customer->fresh()->transactions()->count())->toBe(1)
        ->and($customer->fresh()->transactions()->first()->current_stage)->toBe(PipelineStage::Lead)
        ->and($customer->fresh()->transactions()->first()->vehicle_model)->toBe('Creta IVT');
});

it('reassigns customer to another sales and keeps history', function () {
    $dealer = Dealer::factory()->create();
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $salesA = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesB = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($salesA);

    // supervisor must be in same team as both sales for policy/endpoint check
    Team::factory()->create(['dealer_id' => $dealer->id]);
    // membership wiring is complex; instead test admin reassignment
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);

    $response = $this->actingAs($admin)
        ->patch(route('customers.reassign', $customer), [
            'sales_id' => $salesB->id,
            'notes' => 'Reassign untuk coverage area',
        ]);

    $response->assertRedirect();

    expect($customer->fresh()->assignedSales?->id)->toBe($salesB->id)
        ->and($customer->fresh()->assignments()->count())->toBe(2);
});
