<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
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
        'current_stage' => PipelineStage::Delivery,
        'created_at' => now(),
    ]);
    foreach ([PipelineStage::Do, PipelineStage::Delivery] as $stage) {
        $deal->stageHistories()->create([
            'to_stage' => $stage, 'actor_id' => $sales->id, 'created_at' => now(),
            'po_confirmed' => $stage === PipelineStage::Do, 'dp_confirmed' => $stage === PipelineStage::Do,
            'unit_confirmed' => $stage === PipelineStage::Do,
        ]);
    }

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
    $deal->stageHistories()->create([
        'to_stage' => PipelineStage::Spk, 'actor_id' => $sales->id, 'created_at' => now(),
    ]);
    $loadedHistories = 0;
    StageHistory::retrieved(function () use (&$loadedHistories): void {
        $loadedHistories++;
    });

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
            ->where('analytics.sources.0.spk', 1)
            ->where('analytics.models.0.spk', 1)
            ->has('analytics.drilldown', 1)
            ->missing('analytics.drilldown.0.phone')
            ->missing('analytics.drilldown.0.address')
            ->missing('analytics.drilldown.0.notes')
        );
    expect($loadedHistories)->toBe(0);
});

it('aggregates a month range for source and model, drilldown and CSV, excluding outside months', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    foreach (['2026-09-15' => 'Sept', '2026-10-15' => 'Okt', '2026-11-15' => 'Nov', '2026-12-15' => 'Des'] as $date => $model) {
        $deal = DealTransaction::create(['dealer_id' => $dealer->id, 'customer_id' => $customer->id, 'sales_id' => $sales->id,
            'vehicle_model' => $model, 'source' => 'walk_in', 'current_stage' => PipelineStage::Lead]);
        $deal->forceFill(['created_at' => "$date 03:00:00"])->save();
    }

    $this->actingAs($admin)->get('/analytics?period=2026-10&to=2026-11&mode=acquisition')->assertInertia(fn (Assert $p) => $p
        ->where('analytics.period', '2026-10')->where('analytics.to', '2026-11')
        ->where('analytics.sources.0.total', 2)
        ->where('analytics.models', fn ($rows) => collect($rows)->pluck('model')->sort()->values()->all() === ['Nov', 'Okt'])
        ->has('analytics.drilldown', 2));
    $this->get('/analytics?period=2026-10&mode=acquisition')->assertInertia(fn (Assert $p) => $p
        ->where('analytics.to', '2026-10')->where('analytics.sources.0.total', 1));

    $csv = $this->get('/analytics/export.csv?period=2026-10&to=2026-11&mode=acquisition');
    $csv->assertOk()->assertDownload('analisis-2026-10_2026-11-acquisition.csv');
    expect($csv->streamedContent())->toContain('Nov')->not->toContain('Sept');
});

it('rejects invalid analytics ranges', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->get('/analytics?period=2026-11&to=2026-10')->assertSessionHasErrors('to');
    $this->get('/analytics?to=2026-11')->assertSessionHasErrors('period');
    $this->get('/analytics?period=2026-11&to=bad')->assertSessionHasErrors('to');
});
