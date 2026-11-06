<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\StageHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('counts distinct Jakarta stage events without hydrating dashboard history models', function () {
    $this->travelTo(now('Asia/Jakarta')->setDate(2026, 11, 20));
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $deal = fn (PipelineStage $stage, ?string $closing = null) => DealTransaction::create([
        'dealer_id' => $dealer->id, 'customer_id' => $customer->id, 'sales_id' => $sales->id,
        'vehicle_model' => 'Synthetic model', 'current_stage' => $stage, 'expected_closing_month' => $closing,
    ]);
    $deal(PipelineStage::Prospect, '2026-11-18');
    $deal(PipelineStage::Delivery);
    $deal(PipelineStage::Delivery)->stageHistories()->create([
        'to_stage' => PipelineStage::Delivery, 'actor_id' => $sales->id, 'created_at' => '2026-10-31 16:59:59',
    ]);
    $corrected = $deal(PipelineStage::Lost);
    foreach (['2026-10-31 17:00:00', '2026-11-30 16:59:59'] as $at) {
        $corrected->stageHistories()->create(['to_stage' => PipelineStage::Delivery, 'actor_id' => $sales->id, 'created_at' => $at]);
    }
    $corrected->stageHistories()->create(['to_stage' => PipelineStage::Lost, 'actor_id' => $sales->id, 'created_at' => '2026-11-05 00:00:00']);

    $hydrated = 0;
    Event::listen('eloquent.retrieved: '.StageHistory::class, function () use (&$hydrated): void {
        $hydrated++;
    });

    $this->actingAs($sales)->get(route('dashboard', ['period' => '2026-11']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.realizationUnits', 1)
            ->where('dashboard.stageCounts.delivery', 1)
            ->where('dashboard.stageCounts.lost', 1)
            ->where('dashboard.stageCounts.prospect', 1)
            ->where('dashboard.missingDeliveryHistoryCount', 1));
    expect($hydrated)->toBe(0);
});

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
        'expected_closing_month' => now('Asia/Jakarta')->startOfMonth()->toDateString(),
    ]);
    $delivered = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Stargazer',
        'estimated_value' => 350_000_000,
        'current_stage' => PipelineStage::Delivery,
        'updated_at' => now(),
    ]);

    $delivered->stageHistories()->create(['to_stage' => PipelineStage::Delivery, 'actor_id' => $sales->id, 'created_at' => now()]);

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
