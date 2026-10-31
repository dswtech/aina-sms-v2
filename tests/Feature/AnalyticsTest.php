<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows acquisition analysis by source and model with conversion', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'source' => 'walk_in',
        'current_stage' => PipelineStage::Lead,
        'created_at' => now(),
    ]);
    $deal->transitionTo(PipelineStage::Delivery, $sales);

    $this->actingAs($admin)
        ->get(route('analytics.index', ['period' => now()->format('Y-m'), 'mode' => 'acquisition']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('analytics/index')
            ->where('analytics.mode', 'acquisition')
            ->where('analytics.sources.0.source', 'walk_in')
            ->where('analytics.sources.0.delivery', 1)
            ->where('analytics.sources.0.conversion', 100)
            ->where('analytics.models.0.model', 'Creta')
        );
});

it('hides conversion in achievement mode and sanitizes drilldown', function () {
    $dealer = Dealer::factory()->create();
    $manager = User::factory()->branchManager()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create([
        'dealer_id' => $dealer->id,
        'phone' => '081234567890',
        'address' => 'Rahasia',
    ]);
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'source' => 'walk_in',
        'current_stage' => PipelineStage::Lead,
    ]);
    $deal->transitionTo(PipelineStage::Spk, $sales, options: ['booking_fee_confirmed' => true]);

    $this->actingAs($manager)
        ->get(route('analytics.index', [
            'period' => now()->format('Y-m'),
            'mode' => 'achievement',
            'dimension' => 'source',
            'value' => 'walk_in',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('analytics.mode', 'achievement')
            ->where('analytics.sources.0.conversion', null)
            ->has('analytics.drilldown', 1)
            ->missing('analytics.drilldown.0.phone')
            ->missing('analytics.drilldown.0.address')
            ->missing('analytics.drilldown.0.notes')
        );
});
