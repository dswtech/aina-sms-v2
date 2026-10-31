<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('reconciles sales dashboard metrics to visible source transactions', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    SalesTarget::create([
        'user_id' => $sales->id,
        'period' => now()->startOfMonth()->toDateString(),
        'target_units' => 5,
        'target_value' => 1_000_000_000,
    ]);

    DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'estimated_value' => 300_000_000,
        'current_stage' => PipelineStage::HotProspect,
    ]);
    DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Stargazer',
        'estimated_value' => 350_000_000,
        'current_stage' => PipelineStage::Delivery,
        'updated_at' => now(),
    ]);

    $this->actingAs($sales)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.targetUnits', 5)
            ->where('dashboard.realizationUnits', 1)
            ->where('dashboard.gapUnits', 4)
            ->where('dashboard.stageCounts.hot_prospect', 1)
            ->where('dashboard.stageCounts.delivery', 1)
        );
});

it('does not expose another sales dashboard data', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $other = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($other);

    DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $other->id,
        'vehicle_model' => 'Ioniq 5',
        'current_stage' => PipelineStage::Delivery,
    ]);

    $this->actingAs($sales)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.realizationUnits', 0)
            ->where('dashboard.stageCounts.delivery', 0)
        );
});
