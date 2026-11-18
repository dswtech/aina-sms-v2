<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealBecameStagnant;
use App\Notifications\StagnantDealsSummary;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

function stagnantTime(string $time): CarbonImmutable
{
    return CarbonImmutable::parse($time, 'Asia/Jakarta');
}

function stagnantDeal(object $test, User $sales, string $activityAt, PipelineStage $stage = PipelineStage::Prospect): DealTransaction
{
    $customer = Customer::factory()->create(['dealer_id' => $test->dealer->id]);
    $deal = DealTransaction::create([
        'dealer_id' => $test->dealer->id, 'customer_id' => $customer->id,
        'sales_id' => $sales->id, 'vehicle_model' => 'Model QA', 'current_stage' => $stage,
    ]);
    $deal->forceFill(['last_activity_at' => stagnantTime($activityAt)->utc()])->save();

    return $deal;
}

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $this->sales->id, 'role' => 'sales']);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $this->supervisor->id, 'role' => 'supervisor']);
    TeamMembership::factory()->create(['team_id' => $this->otherTeam->id, 'user_id' => $this->otherSales->id, 'role' => 'sales']);
    TeamMembership::factory()->create(['team_id' => $this->otherTeam->id, 'user_id' => $this->otherSupervisor->id, 'role' => 'supervisor']);
    $this->travelTo(stagnantTime('2026-11-18 00:05'));
});

it('notifies sales per deal and supervisor with a summary', function () {
    stagnantDeal($this, $this->sales, '2026-11-14 20:00');
    stagnantDeal($this, $this->sales, '2026-11-14 03:00');
    stagnantDeal($this, $this->otherSales, '2026-11-14 10:00');

    Artisan::call('notifications:detect-stagnant');

    expect($this->sales->notifications()->where('type', DealBecameStagnant::class)->count())->toBe(2)
        ->and($this->otherSales->notifications()->count())->toBe(1);
    $summary = $this->supervisor->notifications()->sole();
    expect($summary->type)->toBe(StagnantDealsSummary::class)->and($summary->data['count'])->toBe(2)
        ->and($this->otherSupervisor->notifications()->sole()->data['count'])->toBe(1);
});

it('skips deals that have been stagnant for longer than the history window', function () {
    stagnantDeal($this, $this->sales, '2026-10-19 10:00');
    stagnantDeal($this, $this->sales, '2026-11-10 23:59');

    Artisan::call('notifications:detect-stagnant');

    expect(DB::table('notifications')->count())->toBe(0);

    stagnantDeal($this, $this->sales, '2026-11-11 00:00');
    Artisan::call('notifications:detect-stagnant');

    expect($this->sales->notifications()->count())->toBe(1);
});

it('skips closed and active deals', function () {
    foreach ([PipelineStage::Do, PipelineStage::Delivery, PipelineStage::Lost] as $stage) {
        stagnantDeal($this, $this->sales, '2026-11-14 10:00', $stage);
    }
    stagnantDeal($this, $this->sales, '2026-11-17 10:00');

    Artisan::call('notifications:detect-stagnant');

    expect(DB::table('notifications')->count())->toBe(0);
});

it('is idempotent', function () {
    stagnantDeal($this, $this->sales, '2026-11-14 20:00');

    Artisan::call('notifications:detect-stagnant');
    Artisan::call('notifications:detect-stagnant');

    expect(DB::table('notifications')->count())->toBe(2);
});

it('notifies again after the deal is reactivated and stagnates again', function () {
    $deal = stagnantDeal($this, $this->sales, '2026-11-14 20:00');
    Artisan::call('notifications:detect-stagnant');

    $deal->forceFill(['last_activity_at' => stagnantTime('2026-11-18 10:00')->utc()])->save();
    $this->travelTo(stagnantTime('2026-11-22 00:05'));
    Artisan::call('notifications:detect-stagnant');

    $episodes = $this->sales->notifications()->where('type', DealBecameStagnant::class)->get()->pluck('data.activity_at');
    expect($episodes)->toHaveCount(2)->and($episodes->unique())->toHaveCount(2);
});

it('respects the Jakarta day boundary', function () {
    stagnantDeal($this, $this->sales, '2026-11-14 20:00');

    $this->travelTo(stagnantTime('2026-11-17 23:59'));
    Artisan::call('notifications:detect-stagnant');
    expect(DB::table('notifications')->count())->toBe(0);

    $this->travelTo(stagnantTime('2026-11-18 00:05'));
    Artisan::call('notifications:detect-stagnant');
    expect($this->sales->notifications()->count())->toBe(1);
});

it('skips deals of inactive sales and sends no summary when nothing is new', function () {
    $this->sales->update(['is_active' => false]);
    stagnantDeal($this, $this->sales, '2026-11-14 20:00');

    Artisan::call('notifications:detect-stagnant');

    expect(DB::table('notifications')->count())->toBe(0);
});

it('registers the daily schedule', function () {
    Artisan::call('schedule:list');

    expect(Artisan::output())->toContain('notifications:detect-stagnant');
});
