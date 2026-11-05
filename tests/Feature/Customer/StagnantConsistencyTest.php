<?php

use App\Enums\ActivityType;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-11-05 05:00:00', 'UTC'));
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
});

function stagnantFixture(User $sales, ?string $lastActivity, string $createdAt, PipelineStage $stage = PipelineStage::Lead): DealTransaction
{
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id]);
    $customer->assignTo($sales);
    $deal = $customer->transactions()->create([
        'dealer_id' => $sales->dealer_id, 'sales_id' => $sales->id,
        'vehicle_model' => 'Model stagnan QA', 'current_stage' => $stage,
    ]);
    // Persist a legacy null timestamp without the new-record initialization hook.
    $deal->forceFill(['last_activity_at' => $lastActivity, 'created_at' => $createdAt])->save();

    return $deal->fresh();
}

it('uses the same strict Jakarta calendar cutoff in the accessor and query', function (?string $lastActivity, string $createdAt, PipelineStage $stage, bool $expected) {
    $deal = stagnantFixture($this->sales, $lastActivity, $createdAt, $stage);

    expect($deal->is_stagnant)->toBe($expected)
        ->and(DealTransaction::query()->whereKey($deal->id)->stagnant()->exists())->toBe($expected);
})->with([
    'second before Jakarta cutoff' => ['2026-11-01 16:59:59', '2026-10-01 00:00:00', PipelineStage::Lead, true],
    'exact Jakarta cutoff' => ['2026-11-01 17:00:00', '2026-10-01 00:00:00', PipelineStage::Lead, false],
    'second after Jakarta cutoff' => ['2026-11-01 17:00:01', '2026-10-01 00:00:00', PipelineStage::Lead, false],
    'over 72 hours on third calendar day' => ['2026-11-02 00:00:00', '2026-10-01 00:00:00', PipelineStage::Prospect, false],
    'future activity' => ['2026-11-06 00:00:00', '2026-10-01 00:00:00', PipelineStage::HotProspect, false],
    'null activity old creation' => [null, '2026-11-01 16:59:59', PipelineStage::Lead, true],
    'null activity exact creation cutoff' => [null, '2026-11-01 17:00:00', PipelineStage::Lead, false],
    'null activity new creation' => [null, '2026-11-04 17:00:00', PipelineStage::Lead, false],
    'Delivery never stagnant' => ['2026-10-01 00:00:00', '2026-10-01 00:00:00', PipelineStage::Delivery, false],
    'Lost never stagnant' => [null, '2026-10-01 00:00:00', PipelineStage::Lost, false],
]);

it('changes the cutoff at Jakarta midnight even before the UTC date changes', function () {
    $deal = stagnantFixture($this->sales, '2026-11-01 17:00:00', '2026-10-01 00:00:00');
    $this->travelTo(CarbonImmutable::parse('2026-11-05 16:59:59', 'UTC'));
    expect($deal->is_stagnant)->toBeFalse()
        ->and(DealTransaction::query()->stagnant()->exists())->toBeFalse();
    $this->travelTo(CarbonImmutable::parse('2026-11-05 17:00:00', 'UTC'));
    expect($deal->is_stagnant)->toBeTrue()
        ->and(DealTransaction::query()->stagnant()->exists())->toBeTrue();
});

it('reconciles customer filters counts transaction badges and dashboard priorities with legacy null activity', function () {
    $old = stagnantFixture($this->sales, '2026-11-01 16:59:59', '2026-10-01 00:00:00');
    $legacy = stagnantFixture($this->sales, null, '2026-11-01 16:59:59');
    stagnantFixture($this->sales, '2026-11-01 17:00:00', '2026-10-01 00:00:00');
    stagnantFixture($this->sales, '2026-10-01 00:00:00', '2026-10-01 00:00:00', PipelineStage::Delivery);
    stagnantFixture($this->sales, null, '2026-10-01 00:00:00', PipelineStage::Lost);
    $foreignSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    stagnantFixture($foreignSales, '2026-10-01 00:00:00', '2026-10-01 00:00:00');

    $this->actingAs($this->sales)->get('/customers?tab=stagnant')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('counts.stagnant', 2)
            ->has('customers.data', 2)
            ->where('customers.data.0.active_deal.is_stagnant', true)
            ->where('customers.data.1.active_deal.is_stagnant', true));
    $this->get('/transactions?tab=stagnant')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('transactions.data', 2)
            ->where('transactions.data.0.is_stagnant', true)->where('transactions.data.1.is_stagnant', true));
    $this->get('/dashboard?period=2026-11')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('dashboard.stagnantCount', 2)
            ->has('dashboard.priorities.stagnant', 2)
            ->where('dashboard.priorities.stagnant', fn ($items) => collect($items)->pluck('public_id')->sort()->values()->all() === collect([$old->public_id, $legacy->public_id])->sort()->values()->all()));

    $old->customer->logActivity($this->sales, ActivityType::Call, 'Terhubung hari ini', $old);
    expect($old->fresh()->is_stagnant)->toBeFalse();
    $this->get('/customers?tab=stagnant')->assertInertia(fn (Assert $page) => $page->where('counts.stagnant', 1)->has('customers.data', 1));
    $this->get('/transactions?tab=stagnant')->assertInertia(fn (Assert $page) => $page->has('transactions.data', 1));
    $this->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $page) => $page->where('dashboard.stagnantCount', 1)->has('dashboard.priorities.stagnant', 1));
});

it('does not count unreadable stagnant transactions on an otherwise visible customer', function () {
    $visible = stagnantFixture($this->sales, '2026-11-05 04:00:00', '2026-10-01 00:00:00');
    $otherSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $visible->customer->transactions()->create([
        'dealer_id' => $this->dealer->id, 'sales_id' => $otherSales->id,
        'vehicle_model' => 'Model di luar akses', 'last_activity_at' => '2026-10-01 00:00:00',
    ]);

    $this->actingAs($this->sales)->get('/customers')->assertInertia(fn (Assert $page) => $page
        ->has('customers.data', 1)->where('counts.stagnant', 0)
        ->where('customers.data.0.active_deal.is_stagnant', false));
    $this->get('/customers?tab=stagnant')->assertInertia(fn (Assert $page) => $page
        ->where('counts.stagnant', 0)->has('customers.data', 0));
});
