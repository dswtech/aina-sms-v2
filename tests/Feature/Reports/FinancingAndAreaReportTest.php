<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\User;
use App\Services\TransactionMasters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->leasing = fn (string $code) => DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->where('code', $code)->value('id');
});

function rDeal($t, array $attrs = []): DealTransaction
{
    $customer = Customer::factory()->create(['dealer_id' => $t->dealer->id]);
    $customer->assignTo($t->sales);

    return DealTransaction::create(['dealer_id' => $t->dealer->id, 'customer_id' => $customer->id, 'sales_id' => $t->sales->id,
        'vehicle_model' => 'Avanza', 'current_stage' => PipelineStage::Lead, ...$attrs]);
}

function rMove($t, DealTransaction $deal, PipelineStage $stage, string $when, array $options = []): void
{
    $history = $deal->transitionTo($stage, $t->admin, options: $options);
    $history->forceFill(['created_at' => $when])->save();
}

const DO_OK = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
const BANDUNG_ANDIR = ['region_code' => '32.73', 'district_code' => '32.73.05'];

it('counts Prospect cohort once per deal at its first Prospect month with current financing', function () {
    $acc = ($this->leasing)('acc');
    $mk = fn (array $a) => rDeal($this, $a);
    $cash = $mk(['financing_type' => 'cash']);
    $monitored = $mk(['financing_type' => 'credit', 'leasing_id' => $acc]);
    $other = $mk(['financing_type' => 'credit', 'financing_other_name' => 'Zeta Finance']);
    $none = $mk(['financing_type' => 'credit']);
    $unknown = $mk([]);
    $october = $mk(['financing_type' => 'cash']);
    $leadOnly = $mk(['financing_type' => 'cash']);
    $reentry = $mk(['financing_type' => 'cash']);
    foreach ([$cash, $monitored, $other, $none, $unknown] as $deal) {
        rMove($this, $deal, PipelineStage::Prospect, '2026-11-10 03:00:00');
    }
    rMove($this, $october, PipelineStage::Prospect, '2026-10-10 03:00:00');
    rMove($this, $reentry, PipelineStage::Prospect, '2026-10-12 03:00:00');
    rMove($this, $reentry, PipelineStage::Lead, '2026-10-20 03:00:00');
    rMove($this, $reentry, PipelineStage::Prospect, '2026-11-12 03:00:00');

    $this->actingAs($this->admin)->get('/analytics/financing?from=2026-11&to=2026-11&mode=prospect')->assertOk()
        ->assertInertia(fn (Assert $p) => $p->component('analytics/financing')
            ->where('report.total', 5)->where('report.cash', 1)->where('report.credit', 3)->where('report.unknown', 1)
            ->where('report.leasing', fn ($rows) => collect($rows)->pluck('name')->take(-2)->values()->all() === ['Kredit Lain', 'Leasing belum dipilih']
                && collect($rows)->firstWhere('name', 'ACC')['count'] === 1
                && collect($rows)->firstWhere('id', 'other')['count'] === 1
                && collect($rows)->firstWhere('id', 'unselected')['count'] === 1
                && collect($rows)->contains('name', 'Adira Finance')));

    $this->get('/analytics/financing?from=2026-10&to=2026-11&mode=prospect')->assertInertia(fn (Assert $p) => $p
        ->where('report.total', 7)->where('report.cash', 3));
});

it('reads DO financing from the snapshot, drops cancelled DO and ignores Delivery', function () {
    $acc = ($this->leasing)('acc');
    $deal = rDeal($this, [...BANDUNG_ANDIR, 'current_stage' => PipelineStage::Spk, 'financing_type' => 'credit', 'leasing_id' => $acc]);
    rMove($this, $deal, PipelineStage::Do, '2026-11-10 03:00:00', DO_OK);
    $row = fn () => collect($this->actingAs($this->admin)->get('/analytics/financing?from=2026-11&to=2026-11&mode=do')->viewData('page')['props']['report']);

    // Changing the master or the live deal must not rewrite the recorded DO.
    app(TransactionMasters::class)->updateLeasing($this->admin, $acc, ['is_monitored' => false, 'is_active' => false]);
    $deal->forceFill(['financing_type' => 'cash', 'leasing_id' => null])->save();
    expect($row()['total'])->toBe(1)->and($row()['credit'])->toBe(1)
        ->and(collect($row()['leasing'])->firstWhere('name', 'ACC')['count'])->toBe(1);

    rMove($this, $deal->fresh(), PipelineStage::Delivery, '2026-11-20 03:00:00');
    expect($row()['total'])->toBe(1);

    $other = rDeal($this, [...BANDUNG_ANDIR, 'current_stage' => PipelineStage::Spk, 'financing_type' => 'cash']);
    rMove($this, $other, PipelineStage::Do, '2026-11-11 03:00:00', DO_OK);
    expect($row()['total'])->toBe(2);
    $this->actingAs($this->admin)->post("/transactions/{$other->public_id}/cancel-do", ['reason' => 'batal', 'do_event_id' => $other->currentDoEvent()->id]);
    expect($row()['total'])->toBe(1);
});

it('maps DO by snapshot FOA with Area lain last and a zero-safe empty range', function () {
    app(TransactionMasters::class)->setFoa($this->admin, ['32.73.05']);
    foreach ([BANDUNG_ANDIR, BANDUNG_ANDIR, ['region_code' => '32.73', 'district_code' => '32.73.03'], ['region_code' => 'other', 'other_city' => 'Jakarta']] as $area) {
        $deal = rDeal($this, [...$area, 'current_stage' => PipelineStage::Spk]);
        rMove($this, $deal, PipelineStage::Do, '2026-11-10 03:00:00', DO_OK);
    }
    // FOA changes after the fact do not recolor history.
    app(TransactionMasters::class)->setFoa($this->admin, []);

    $this->actingAs($this->admin)->get('/analytics/mapping-area?from=2026-11&to=2026-11')->assertOk()
        ->assertInertia(fn (Assert $p) => $p->component('analytics/mapping-area')
            ->where('report.total', 4)->where('report.foa', 2)->where('report.other', 2)
            ->where('report.rows.0.districtName', 'Andir')->where('report.rows.0.regionName', 'Kota Bandung')->where('report.rows.0.count', 2)
            ->where('report.rows.1.id', 'other')->where('report.rows.1.count', 2));
    $this->get('/analytics/mapping-area?from=2026-01&to=2026-01')->assertInertia(fn (Assert $p) => $p
        ->where('report.total', 0)->where('report.rows.0.id', 'other')->where('report.rows.0.count', 0));
});

it('limits reports to the attribution scope and validates the range', function () {
    $team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $spv = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $team->memberships()->create(['user_id' => $spv->id, 'role' => 'supervisor', 'started_at' => now()]);
    $mine = rDeal($this, [...BANDUNG_ANDIR, 'team_id' => $team->id, 'current_stage' => PipelineStage::Spk]);
    $theirs = rDeal($this, [...BANDUNG_ANDIR, 'current_stage' => PipelineStage::Spk]);
    foreach ([$mine, $theirs] as $deal) {
        rMove($this, $deal, PipelineStage::Do, '2026-11-10 03:00:00', DO_OK);
    }

    $this->actingAs($spv)->get('/analytics/mapping-area?from=2026-11&to=2026-11')->assertInertia(fn (Assert $p) => $p->where('report.total', 1));
    $bm = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($bm)->get('/analytics/mapping-area?from=2026-11&to=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('report.total', 2)->missing('report.customers'));
    $this->actingAs($this->sales)->get('/analytics/financing')->assertForbidden();
    $this->actingAs($this->admin)->get('/analytics/financing?from=2026-12&to=2026-11')->assertSessionHasErrors('to');
    $this->get('/analytics/mapping-area?from=bad&to=2026-11')->assertSessionHasErrors('from');
});

it('scopes the financing report to the supervisor team in both modes', function () {
    $team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $spv = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $team->memberships()->create(['user_id' => $spv->id, 'role' => 'supervisor', 'started_at' => now()]);
    $mine = rDeal($this, [...BANDUNG_ANDIR, 'team_id' => $team->id, 'financing_type' => 'cash']);
    $theirs = rDeal($this, [...BANDUNG_ANDIR, 'financing_type' => 'cash']);
    foreach ([$mine, $theirs] as $deal) {
        rMove($this, $deal, PipelineStage::Prospect, '2026-11-09 03:00:00');
        rMove($this, $deal, PipelineStage::Spk, '2026-11-10 03:00:00', ['booking_fee_confirmed' => true]);
        rMove($this, $deal, PipelineStage::Do, '2026-11-11 03:00:00', DO_OK);
    }
    $bm = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);

    foreach (['prospect', 'do'] as $mode) {
        $this->actingAs($spv)->get("/analytics/financing?from=2026-11&to=2026-11&mode=$mode")->assertInertia(fn (Assert $p) => $p->where('report.total', 1));
        $this->actingAs($bm)->get("/analytics/financing?from=2026-11&to=2026-11&mode=$mode")->assertInertia(fn (Assert $p) => $p->where('report.total', 2));
    }
});
