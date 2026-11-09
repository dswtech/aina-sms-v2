<?php

use App\Enums\ActivityType;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use App\Services\TransactionTimeline;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'customer_id' => $customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Creta',
    ]);
    // One event per minute so ordering is unambiguous: stage, activity, comment, repeated.
    $this->travelTo(now()->startOfDay());
    for ($i = 1; $i <= 3; $i++) {
        $this->travel(1)->minutes();
        if ($i <= 2) {
            $this->deal->stageHistories()->create([
                'from_stage' => 'lead', 'to_stage' => 'prospect', 'actor_id' => $this->sales->id, 'created_at' => now(),
            ]);
            $this->travel(1)->minutes();
            $customer->logActivity($this->sales, ActivityType::Call, 'Telepon '.$i, $this->deal);
            $this->travel(1)->minutes();
        }
        $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Komentar '.$i]);
    }
});

it('filters the timeline by event kind', function () {
    $page = app(TransactionTimeline::class)->paginate($this->deal, $this->sales, kinds: ['comment']);

    expect($page['total'])->toBe(3)
        ->and(collect($page['data'])->pluck('kind')->unique()->all())->toBe(['comment']);
});

it('puts the newest events on page 1 when newestFirst is set', function () {
    $service = app(TransactionTimeline::class);
    $first = $service->paginate($this->deal, $this->sales, kinds: ['comment'], newestFirst: true, perPage: 2);
    $second = $service->paginate($this->deal, $this->sales, page: 2, kinds: ['comment'], newestFirst: true, perPage: 2);

    expect($first['last_page'])->toBe(2)
        ->and(collect($first['data'])->pluck('body')->all())->toBe(['Komentar 3', 'Komentar 2'])
        ->and(collect($second['data'])->pluck('body')->all())->toBe(['Komentar 1']);
});

it('keeps the oldest-first all-kinds default for existing callers', function () {
    $page = app(TransactionTimeline::class)->paginate($this->deal, $this->sales);

    expect($page['total'])->toBe(7)
        ->and(collect($page['data'])->pluck('occurred_at')->all())->toBe(collect($page['data'])->pluck('occurred_at')->sort()->values()->all())
        ->and($page['data'][0]['kind'])->toBe('stage');
});

// The Branch Manager has no route to the transactions page today; this guard keeps the history closed if that changes.
it('never opens the history to a Branch Manager', function () {
    $manager = User::factory()->branchManager()->create(['dealer_id' => $this->deal->dealer_id]);

    expect(fn () => app(TransactionTimeline::class)->paginate($this->deal, $manager))
        ->toThrow(HttpException::class);
});
