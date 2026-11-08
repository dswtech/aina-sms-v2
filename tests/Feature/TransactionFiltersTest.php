<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
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
