<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use App\Notifications\StagnantDealsSummary;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

it('filters progress dates inclusively in Jakarta and combines source with actor scope', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $other = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);
    foreach ([
        ['Before', '2026-10-31 16:59:59', 'walk_in', $sales],
        ['Start', '2026-10-31 17:00:00', 'walk_in', $sales],
        ['End', '2026-11-05 16:59:59', 'walk_in', $sales],
        ['After', '2026-11-05 17:00:00', 'walk_in', $sales],
        ['Other source', '2026-11-02 00:00:00', 'referral', $sales],
        ['Numeric source', '2026-11-02 00:00:00', '0', $sales],
        ['Other sales', '2026-11-02 00:00:00', 'private_source', $other],
    ] as [$model, $created, $source, $owner]) {
        $deal = DealTransaction::create(['dealer_id' => $dealer->id, 'customer_id' => $customer->id, 'sales_id' => $owner->id,
            'vehicle_model' => $model, 'source' => $source, 'current_stage' => 'lead']);
        $deal->forceFill(['created_at' => $created, 'progress_at' => $created])->save();
    }
    $this->actingAs($sales)->get('/transactions?date_from=2026-11-01&date_to=2026-11-05&source=walk_in')->assertInertia(fn (Assert $p) => $p
        ->has('transactions.data', 2)
        ->where('transactions.data', fn ($rows): bool => collect($rows)->pluck('vehicle_model')->sort()->values()->all() === ['End', 'Start'])
        ->where('filters.date_from', '2026-11-01')->where('filters.date_to', '2026-11-05')->where('filters.source', 'walk_in')
        ->where('sourceOptions', ['0', 'referral', 'walk_in']));
    $this->get('/transactions?date_from=&date_to=&source=0')->assertInertia(fn (Assert $p) => $p
        ->has('transactions.data', 1)->where('transactions.data.0.vehicle_model', 'Numeric source'));
});

it('validates transaction date ranges and source before querying', function (string $query, string $field) {
    $sales = User::factory()->sales()->create();
    $this->actingAs($sales)->get('/transactions?'.$query)->assertSessionHasErrors($field);
})->with([
    ['date_from=not-a-date', 'date_from'],
    ['date_to=2026-02-30', 'date_to'],
    ['date_from=2026-11-05&date_to=2026-11-01', 'date_to'],
    ['source[]=walk_in', 'source'],
]);

/** @param list<array{0: string, 1: string, 2?: array<string, mixed>}> $history */
function filterDeal(User $sales, string $model, string $current, array $history): DealTransaction
{
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id]);
    $customer->assignTo($sales);
    $deal = DealTransaction::create(['dealer_id' => $sales->dealer_id, 'customer_id' => $customer->id, 'sales_id' => $sales->id,
        'vehicle_model' => $model, 'source' => 'walk_in', 'current_stage' => $current]);
    $deal->forceFill(['created_at' => '2026-11-01 03:00:00'])->save();
    foreach ($history as $row) {
        [$stage, $day] = $row;
        StageHistory::create(['deal_transaction_id' => $deal->id, 'to_stage' => $stage, 'actor_id' => $sales->id,
            'created_at' => "$day 03:00:00", ...($row[2] ?? [])]);
    }

    return $deal;
}

function filterModels(string $query): array
{
    return collect(test()->get('/transactions?'.$query)->viewData('page')['props']['transactions']['data'])
        ->pluck('vehicle_model')->sort()->values()->all();
}

it('lists a DO deal under its lead date', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]);
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    filterDeal($sales, 'Mobil DO', 'do', [['lead', '2026-11-05'], ['spk', '2026-11-08'], ['do', '2026-11-10', $checklist]]);
    $this->actingAs($sales);

    expect(filterModels('stage=lead&date_from=2026-11-05&date_to=2026-11-05'))->toBe(['Mobil DO'])
        ->and(filterModels('stage=do&date_from=2026-11-05&date_to=2026-11-05'))->toBe([])
        ->and(filterModels('stage=do&date_from=2026-11-10&date_to=2026-11-10'))->toBe(['Mobil DO']);
});

it('hides a voided stage date from the list', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]);
    filterDeal($sales, 'Mundur', 'prospect', [['lead', '2026-11-05'], ['hot_prospect', '2026-11-07'], ['prospect', '2026-11-09']]);
    $this->actingAs($sales);

    expect(filterModels('stage=hot_prospect&date_from=2026-11-07&date_to=2026-11-07'))->toBe([]);
});

it('lists any deal with a stage date in range when stage is empty', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]);
    filterDeal($sales, 'Dalam', 'hot_prospect', [['lead', '2026-11-05'], ['hot_prospect', '2026-11-20']]);
    filterDeal($sales, 'Luar', 'hot_prospect', [['lead', '2026-10-05'], ['hot_prospect', '2026-10-20']]);
    $this->actingAs($sales);

    expect(filterModels('date_from=2026-11-18&date_to=2026-11-22'))->toBe(['Dalam']);
});

it('lists every deal that ever reached a stage when the range is empty', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]);
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    filterDeal($sales, 'Pernah SPK', 'do', [['lead', '2026-11-05'], ['spk', '2026-11-08'], ['do', '2026-11-10', $checklist]]);
    filterDeal($sales, 'Belum SPK', 'prospect', [['lead', '2026-11-05'], ['prospect', '2026-11-06']]);
    $this->actingAs($sales);

    expect(filterModels('stage=spk&date_from=&date_to='))->toBe(['Pernah SPK']);
});

it('lists stagnant deals from earlier months when following the stagnant notification link', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-19 10:00', 'Asia/Jakarta'));
    $sales = User::factory()->sales()->create();
    $deal = filterDeal($sales, 'Old stagnant', 'prospect', [['prospect', '2026-09-10']]);
    $deal->forceFill(['created_at' => '2026-09-10 03:00:00', 'last_activity_at' => '2026-09-10 03:00:00'])->save();

    $this->actingAs($sales)->get('/transactions?tab=stagnant')->assertInertia(fn (Assert $p) => $p->has('transactions.data', 0));
    $url = (new StagnantDealsSummary(1))->toDatabase($sales)['url'];
    $this->get($url)->assertInertia(fn (Assert $p) => $p
        ->has('transactions.data', 1)->where('transactions.data.0.vehicle_model', 'Old stagnant'));
});
