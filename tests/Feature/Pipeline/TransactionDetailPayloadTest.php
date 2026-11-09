<?php

use App\Enums\ActivityType;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Creta',
    ]);
    $this->url = "/transactions/{$this->deal->public_id}";
});

function jakarta(string $time): CarbonImmutable
{
    // Stored timestamps are UTC wall-clock strings, so convert before forceFill.
    return CarbonImmutable::parse($time, 'Asia/Jakarta')->utc();
}

it('counts Jakarta calendar days since progress_at, not elapsed hours', function () {
    $this->travelTo(jakarta('2026-11-09 00:10:00'));
    $this->deal->forceFill(['progress_at' => jakarta('2026-11-08 23:50:00')])->saveQuietly();
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()->assertJsonPath('days_in_stage', 1);

    $this->deal->forceFill(['progress_at' => jakarta('2026-10-28 12:00:00')])->saveQuietly();
    $this->getJson($this->url)->assertJsonPath('days_in_stage', 12);
});

it('has no days_in_stage for a closed stage', function () {
    $this->deal->forceFill(['current_stage' => PipelineStage::Lost])->saveQuietly();

    // assertJsonPath alone would also pass when the key is missing.
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonStructure(['days_in_stage'])->assertJsonPath('days_in_stage', null);
});

it('carries stages newest first and the newest comments page, without the old history key', function () {
    $this->deal->stageHistories()->create(['from_stage' => 'lead', 'to_stage' => 'prospect', 'actor_id' => $this->sales->id, 'created_at' => now()->subHour()]);
    $this->deal->stageHistories()->create(['from_stage' => 'prospect', 'to_stage' => 'hot_prospect', 'actor_id' => $this->sales->id, 'created_at' => now()]);
    $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Halo']);

    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonPath('stages.total', 2)
        ->assertJsonPath('stages.data.0.label', 'Prospect → Hot Prospect')
        ->assertJsonPath('comments.total', 1)
        ->assertJsonPath('comments.data.0.body', 'Halo')
        ->assertJsonPath('can_comment', true)
        ->assertJsonMissingPath('history');
});

it('lets only Sales and Supervisor comment', function () {
    $admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);

    $this->actingAs($admin)->getJson($this->url)->assertOk()->assertJsonPath('can_comment', false);
});

it('pages comments newest first without overlap', function () {
    for ($i = 1; $i <= 25; $i++) {
        $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => "K{$i}"]);
    }
    $this->actingAs($this->sales);
    $first = $this->getJson("{$this->url}/feed?kind=comments")->assertOk()
        ->assertJsonCount(20, 'data')->assertJsonPath('last_page', 2)->assertJsonPath('data.0.body', 'K25')->json('data');
    $second = $this->getJson("{$this->url}/feed?kind=comments&page=2")->assertOk()
        ->assertJsonCount(5, 'data')->assertJsonPath('data.0.body', 'K5')->json('data');

    expect(collect([...$first, ...$second])->pluck('key')->unique())->toHaveCount(25);
});

it('returns only activities for kind=activities', function () {
    $this->customer->logActivity($this->sales, ActivityType::Call, 'Telepon', $this->deal);
    $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Bukan aktivitas']);

    $this->actingAs($this->sales)->getJson("{$this->url}/feed?kind=activities")->assertOk()
        ->assertJsonPath('total', 1)->assertJsonPath('data.0.kind', 'activity');
});

it('rejects an unknown kind and page 0', function () {
    $this->actingAs($this->sales);
    $this->getJson("{$this->url}/feed?kind=stages")->assertUnprocessable();
    $this->getJson("{$this->url}/feed")->assertUnprocessable();
    $this->getJson("{$this->url}/feed?kind=comments&page=0")->assertUnprocessable();
});

it('hides the feed from Sales who cannot see the transaction', function () {
    $stranger = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);

    $this->actingAs($stranger)->getJson("{$this->url}/feed?kind=comments")->assertForbidden();
});
