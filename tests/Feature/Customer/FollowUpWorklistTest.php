<?php

use App\Models\Customer;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

it('matches follow-up lists and counts to Jakarta day boundaries without including completed or foreign work', function (string $instant) {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse($instant, 'UTC'));
    $sales = User::factory()->sales()->create();
    $other = User::factory()->sales()->create(['dealer_id' => $sales->dealer_id]);
    $customers = [];
    foreach ([
        'overdue' => ['2026-11-04 16:59:59', 'pending', $sales],
        'start' => ['2026-11-04 17:00:00', 'pending', $sales],
        'end' => ['2026-11-05 16:59:59', 'pending', $sales],
        'tomorrow' => ['2026-11-05 17:00:00', 'pending', $sales],
        'completed' => ['2026-11-04 18:00:00', 'completed', $sales],
        'foreign' => ['2026-11-04 18:00:00', 'pending', $other],
    ] as $key => [$at, $status, $owner]) {
        $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id]);
        $customer->assignTo($owner);
        $followUp = $customer->scheduleFollowUp($owner, $owner, CarbonImmutable::parse($at, 'UTC'), 'Hubungi');
        $followUp->update(['status' => $status]);
        $customers[$key] = $customer->public_id;
    }
    foreach (['follow_up_today' => ['start', 'end'], 'overdue' => ['overdue']] as $tab => $keys) {
        $expected = collect($keys)->map(fn ($key) => $customers[$key])->sort()->values()->all();
        $this->actingAs($sales)->get('/customers?tab='.$tab)->assertOk()->assertInertia(fn (Assert $p) => $p
            ->where('counts.follow_up_today', 2)->where('counts.overdue', 1)
            ->has('customers.data', count($keys))
            ->where('customers.data', fn ($rows) => collect($rows)->pluck('public_id')->sort()->values()->all() === $expected));
    }
})->with(['UTC previous date' => '2026-11-04 18:00:00', 'UTC same date' => '2026-11-05 05:00:00']);
