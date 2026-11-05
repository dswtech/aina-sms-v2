<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-11-15 05:00:00', 'UTC'));
    config(['forecast.weights' => ['lead' => 0.1, 'prospect' => 0.25, 'hot_prospect' => 0.5, 'spk' => 0.75, 'do' => 0.9]]);
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->secondSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->supervisor, $this->sales, $this->secondSales] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    $this->customer = Customer::factory()->create([
        'dealer_id' => $this->dealer->id, 'address' => 'PRIVATE_ADDRESS_G09', 'notes' => 'PRIVATE_NOTES_G09',
    ]);
    $this->customer->assignTo($this->sales);
    $this->deals = [];
    // Independent ledger: weights total 3 units; weighted values total 1710.
    foreach ([['hot_prospect', 1200], ['prospect', 1000], ['do', 500], ['spk', 400], ['lead', 100], ['hot_prospect', 200]] as $i => [$stage, $value]) {
        $deal = DealTransaction::create([
            'dealer_id' => $this->dealer->id, 'team_id' => $this->team->id,
            'customer_id' => $this->customer->id, 'sales_id' => $i < 3 ? $this->sales->id : $this->secondSales->id,
            'vehicle_model' => $i < 3 ? 'Model A' : 'Model B', 'source' => $i < 3 ? 'walk_in' : 'referral',
            'current_stage' => $stage, 'estimated_value' => $value, 'expected_closing_month' => '2026-11-01',
        ]);
        $deal->stageHistories()->create(['to_stage' => $stage, 'actor_id' => $this->sales->id, 'created_at' => '2026-11-03 00:00:00']);
        $this->deals[] = $deal;
    }
    $this->delivered = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'team_id' => $this->team->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model A', 'source' => 'walk_in', 'current_stage' => 'delivery',
    ]);
    $this->delivered->forceFill(['created_at' => '2026-10-31 16:59:59'])->save();
    foreach (['spk', 'spk', 'do', 'delivery', 'delivery'] as $stage) {
        $this->delivered->stageHistories()->create(['to_stage' => $stage, 'actor_id' => $this->sales->id, 'created_at' => '2026-11-04 00:00:00']);
    }
    foreach ([[$this->dealer, 'OTHER_TEAM_G09'], [Dealer::factory()->create(), 'FOREIGN_DEALER_G09']] as [$dealer, $marker]) {
        $team = Team::factory()->create(['dealer_id' => $dealer->id]);
        $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
        $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
        $deal = DealTransaction::create([
            'dealer_id' => $dealer->id, 'team_id' => $team->id, 'customer_id' => $customer->id,
            'sales_id' => $sales->id, 'vehicle_model' => $marker, 'source' => $marker, 'current_stage' => 'delivery',
        ]);
        $deal->stageHistories()->create(['to_stage' => 'delivery', 'actor_id' => $sales->id, 'created_at' => '2026-11-05 00:00:00']);
    }
    TeamTarget::create(['team_id' => $this->team->id, 'period' => '2026-11-01', 'target_units' => 10]);
    SalesTarget::create(['user_id' => $this->sales->id, 'period' => '2026-11-01', 'target_units' => 6]);
    SalesTarget::create(['user_id' => $this->secondSales->id, 'period' => '2026-11-01', 'target_units' => 4]);
});

it('reconciles team and personal forecast metrics and ranks exactly five authorized contributors by weighted value', function () {
    $expectedIds = collect([0, 2, 3, 1, 5])->map(fn ($i) => $this->deals[$i]->public_id)->all();
    $this->actingAs($this->supervisor)->get('/dashboard?period=2026-11')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', 10)->where('dashboard.realizationUnits', 1)
        ->where('dashboard.forecastUnits', 4)->where('dashboard.forecastValue', 1710)
        ->where('dashboard.gapUnits', 9)->where('dashboard.forecastGapUnits', 6)
        ->where('dashboard.stageCounts', ['lead' => 1, 'prospect' => 1, 'hot_prospect' => 2, 'spk' => 1, 'do' => 1, 'delivery' => 1, 'lost' => 0])
        ->has('dashboard.performance', 2)->has('dashboard.teams', 1)
        ->where('dashboard.performance', function ($rows) {
            $a = collect($rows)->firstWhere('id', $this->sales->id);
            $b = collect($rows)->firstWhere('id', $this->secondSales->id);

            return $a['realization_units'] === 1 && $a['forecast_units'] === 2.65 && $a['forecast_value'] == 1300
                && $a['target_units'] == 6 && $a['gap_units'] == 5 && $a['forecast_gap_units'] == 3.35
                && $b['realization_units'] === 0 && $b['forecast_units'] === 1.35 && $b['forecast_value'] == 410
                && $b['target_units'] == 4 && $b['gap_units'] == 4 && $b['forecast_gap_units'] == 2.65;
        })
        ->where('dashboard.contributors', fn ($rows) => collect($rows)->pluck('public_id')->all() === $expectedIds)
        ->where('dashboard.contributors', fn ($rows) => collect($rows)->pluck('weighted_value')->all() == [600, 450, 300, 250, 100]));
});

it('reconciles multiple source and model groups and drilldowns to the independent acquisition and achievement ledger', function (string $mode) {
    $achievement = $mode === 'achievement';
    $this->actingAs($this->supervisor)->get('/analytics?period=2026-11&mode='.$mode)->assertOk()->assertInertia(fn (Assert $p) => $p
        ->has('analytics.sources', 2)->has('analytics.models', 2)
        ->where('analytics.sources', function ($rows) use ($achievement) {
            $rows = collect($rows)->keyBy('source');

            return $rows['walk_in'] == ['source' => 'walk_in', 'total' => $achievement ? 4 : 3, 'share' => $achievement ? 57.1 : 50, 'spk' => $achievement ? 1 : 0, 'do' => $achievement ? 2 : 1, 'delivery' => $achievement ? 1 : 0, 'conversion' => $achievement ? null : 0]
                && $rows['referral'] == ['source' => 'referral', 'total' => 3, 'share' => $achievement ? 42.9 : 50, 'spk' => 1, 'do' => 0, 'delivery' => 0, 'conversion' => $achievement ? null : 0];
        })
        ->where('analytics.models', function ($rows) use ($achievement) {
            $rows = collect($rows)->keyBy('model');

            return $rows['Model A'] == ['model' => 'Model A', 'total' => $achievement ? 4 : 3, 'share' => $achievement ? 57.1 : 50, 'spk' => $achievement ? 1 : 0, 'do' => $achievement ? 2 : 1, 'delivery' => $achievement ? 1 : 0]
                && $rows['Model B'] == ['model' => 'Model B', 'total' => 3, 'share' => $achievement ? 42.9 : 50, 'spk' => 1, 'do' => 0, 'delivery' => 0];
        }));
    foreach (['source' => 'walk_in', 'model' => 'Model A'] as $dimension => $value) {
        $ids = collect(array_slice($this->deals, 0, 3))->pluck('public_id');
        if ($achievement) {
            $ids->push($this->delivered->public_id);
        }
        $this->get('/analytics?'.http_build_query(['period' => '2026-11', 'mode' => $mode, 'dimension' => $dimension, 'value' => $value]))
            ->assertInertia(fn (Assert $p) => $p->where('analytics.drilldown', fn ($rows) => collect($rows)->pluck('public_id')->sort()->values()->all() === $ids->sort()->values()->all()));
    }
})->with(['acquisition', 'achievement']);

it('retains historical acquisition conversion while suppressing unavailable historical forecasts', function () {
    $this->actingAs($this->supervisor)->get('/analytics?period=2026-10&mode=acquisition')->assertInertia(fn (Assert $p) => $p
        ->has('analytics.sources', 1)->where('analytics.sources.0.total', 1)->where('analytics.sources.0.conversion', 100));
    $this->get('/dashboard?period=2026-10')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.realizationUnits', 0)->where('dashboard.forecastUnits', null)
        ->where('dashboard.forecastGapUnits', null)->where('dashboard.contributors', []));
    $this->get('/analytics?period=2026-12&mode=achievement')->assertInertia(fn (Assert $p) => $p
        ->where('analytics.sources', [])->where('analytics.models', [])->where('analytics.drilldown', []));
});

it('never serializes customer contact relationship or coaching data in manager page props', function () {
    $comment = $this->deals[0]->comments()->create(['user_id' => $this->sales->id, 'body' => 'PRIVATE_COACHING_G09']);
    $comment->revisions()->create(['old_body' => 'PRIVATE_REVISION_G09', 'edited_by_id' => $this->sales->id, 'edited_at' => now()]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($manager);
    foreach (['/dashboard?period=2026-11', '/team-performance?period=2026-11', '/analytics?period=2026-11&mode=acquisition', '/analytics?period=2026-11&mode=achievement&dimension=model&value=Model+A'] as $url) {
        $response = $this->get($url)->assertOk();
        $props = $response->original->getData()['page']['props'];
        $json = json_encode($props, JSON_THROW_ON_ERROR);
        foreach ([$this->customer->phone, $this->customer->email, 'PRIVATE_ADDRESS_G09', 'PRIVATE_NOTES_G09', 'PRIVATE_COACHING_G09', 'PRIVATE_REVISION_G09', 'FOREIGN_DEALER_G09'] as $secret) {
            expect($json)->not->toContain($secret);
        }
        if (isset($props['dashboard'])) {
            expect($props['dashboard']['realizationUnits'])->toBe(2)
                ->and($props['dashboard']['forecastUnits'])->toEqual(5)
                ->and($props['dashboard']['priorities'])->toBe(['stagnant' => [], 'closing' => [], 'unread' => []]);
        }
    }
});
