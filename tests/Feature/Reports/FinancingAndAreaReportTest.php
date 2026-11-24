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
    // Moving back needs a written reason; harmless for forward moves.
    $history = $deal->transitionTo($stage, $t->admin, 'Uji', $options);
    $history->forceFill(['created_at' => $when])->save();
}

const DO_OK = ['vehicle_ownership' => 'first_buyer', 'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
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

it('reads DO financing from the snapshot, drops cancelled DO', function () {
    $acc = ($this->leasing)('acc');
    $deal = rDeal($this, [...BANDUNG_ANDIR, 'current_stage' => PipelineStage::Spk, 'financing_type' => 'credit', 'leasing_id' => $acc]);
    rMove($this, $deal, PipelineStage::Do, '2026-11-10 03:00:00', DO_OK);
    $row = fn () => collect($this->actingAs($this->admin)->get('/analytics/financing?from=2026-11&to=2026-11&mode=do')->viewData('page')['props']['report']);

    // Changing the master or the live deal must not rewrite the recorded DO.
    app(TransactionMasters::class)->updateLeasing($this->admin, $acc, ['is_monitored' => false, 'is_active' => false]);
    $deal->forceFill(['financing_type' => 'cash', 'leasing_id' => null])->save();
    expect($row()['total'])->toBe(1)->and($row()['credit'])->toBe(1)
        ->and(collect($row()['leasing'])->firstWhere('name', 'ACC')['count'])->toBe(1);

    $other = rDeal($this, [...BANDUNG_ANDIR, 'current_stage' => PipelineStage::Spk, 'financing_type' => 'cash']);
    rMove($this, $other, PipelineStage::Do, '2026-11-11 03:00:00', DO_OK);
    expect($row()['total'])->toBe(2);
    $this->actingAs($this->admin)->post("/transactions/{$other->public_id}/cancel-do", ['reason' => 'batal', 'do_event_id' => $other->currentDoEvent()->id]);
    expect($row()['total'])->toBe(1);
});

function areaDo($t, array $area, string $when = '2026-11-10 03:00:00'): DealTransaction
{
    $deal = rDeal($t, [...$area, 'current_stage' => PipelineStage::Spk]);
    rMove($t, $deal, PipelineStage::Do, $when, DO_OK);

    return $deal;
}

function areaReport($t, string $from = '2026-11', string $to = '2026-11'): array
{
    return $t->actingAs($t->admin)->get("/analytics/mapping-area?from=$from&to=$to")->assertOk()->viewData('page')['props']['report'];
}

function firstDistrict(string $region): string
{
    return DB::table('area_districts')->where('region_code', $region)->orderBy('code')->value('code');
}

it('maps DO into FOA, PMA outside FOA and outside PMA', function () {
    app(TransactionMasters::class)->setFoa($this->admin, ['32.73.05']);
    foreach ([BANDUNG_ANDIR, BANDUNG_ANDIR, ['region_code' => '32.73', 'district_code' => '32.73.03'],
        ['region_code' => '32.11', 'district_code' => firstDistrict('32.11')], ['region_code' => 'other', 'other_city' => 'Jakarta']] as $area) {
        areaDo($this, $area);
    }
    // FOA changes after the fact do not recolor history.
    app(TransactionMasters::class)->setFoa($this->admin, []);
    app(TransactionMasters::class)->setFoa($this->admin, ['32.73.05']);

    $this->actingAs($this->admin)->get('/analytics/mapping-area?from=2026-11&to=2026-11')->assertOk()
        ->assertInertia(fn (Assert $p) => $p->component('analytics/mapping-area'));
    $r = areaReport($this);
    expect([$r['total'], $r['foa'], $r['pmaOutsideFoa'], $r['outsidePma'], $r['unverified']])->toBe([5, 2, 1, 2, 0])
        ->and($r['districts'][0])->toMatchArray(['id' => '32.73.05', 'name' => 'Andir', 'regionName' => 'Kota Bandung', 'count' => 2])
        ->and(end($r['districts']))->toMatchArray(['id' => 'other', 'name' => 'Kecamatan lain', 'count' => 3])
        ->and($r['regions'][0])->toMatchArray(['id' => '32.73', 'name' => 'Kota Bandung', 'isPma' => true, 'count' => 3, 'foa' => 2])
        ->and(collect($r['regions'])->firstWhere('id', '32.11'))->toMatchArray(['isPma' => false, 'count' => 1, 'foa' => 0])
        ->and(end($r['regions']))->toMatchArray(['id' => 'other', 'name' => 'Kota Lain', 'isPma' => false, 'count' => 1])
        ->and(end($r['months']))->toBe(['month' => '2026-11', 'total' => 5, 'foa' => 2, 'pma' => 3]);
});

it('keeps snapshot PMA after the list changes', function () {
    areaDo($this, ['region_code' => '32.77', 'district_code' => '32.77.01']);
    app(TransactionMasters::class)->setPma($this->admin, []);
    $r = areaReport($this);
    expect($r['pmaOutsideFoa'])->toBe(1)
        ->and(collect($r['regions'])->firstWhere('id', '32.77'))->toMatchArray(['isPma' => false, 'count' => 1]);
});

it('counts FOA first even outside PMA regions', function () {
    $district = firstDistrict('32.11');
    app(TransactionMasters::class)->setFoa($this->admin, [$district]);
    areaDo($this, ['region_code' => '32.11', 'district_code' => $district]);
    $r = areaReport($this);
    expect([$r['foa'], $r['pmaOutsideFoa'], $r['outsidePma']])->toBe([1, 0, 0])
        ->and(end($r['months'])['pma'])->toBe(1);
});

it('returns zero rows for an empty range', function () {
    $r = areaReport($this, '2026-01', '2026-03');
    expect($r['total'])->toBe(0)
        ->and($r['months'])->toBe([
            ['month' => '2025-10', 'total' => 0, 'foa' => 0, 'pma' => 0],
            ['month' => '2025-11', 'total' => 0, 'foa' => 0, 'pma' => 0],
            ['month' => '2025-12', 'total' => 0, 'foa' => 0, 'pma' => 0],
            ['month' => '2026-01', 'total' => 0, 'foa' => 0, 'pma' => 0],
            ['month' => '2026-02', 'total' => 0, 'foa' => 0, 'pma' => 0],
            ['month' => '2026-03', 'total' => 0, 'foa' => 0, 'pma' => 0],
        ])
        ->and(collect($r['regions'])->where('isPma', true)->pluck('id')->sort()->values()->all())->toBe(['32.03', '32.04', '32.13', '32.14', '32.17', '32.73', '32.77'])
        ->and(collect($r['regions'])->sum('count'))->toBe(0)
        ->and(count($r['districts']))->toBe(17)
        ->and(end($r['districts']))->toMatchArray(['id' => 'other', 'count' => 0]);
});

it('ignores legacy DO without snapshot', function () {
    $deal = areaDo($this, BANDUNG_ANDIR);
    DB::table('stage_histories')->where('deal_transaction_id', $deal->id)->whereNotNull('area_snapshot')->update(['area_snapshot' => null]);
    $r = areaReport($this);
    expect([$r['unverified'], $r['total']])->toBe([1, 0]);
});

it('splits months in Asia/Jakarta', function () {
    areaDo($this, BANDUNG_ANDIR, '2026-10-31 18:00:00');
    $r = areaReport($this, '2026-10', '2026-11');
    expect(array_column($r['months'], 'total'))->toBe([0, 0, 0, 0, 0, 1]);
});

it('trends at least six months without counting earlier DO in the selected range', function () {
    areaDo($this, BANDUNG_ANDIR, '2026-08-10 03:00:00');
    $legacy = areaDo($this, BANDUNG_ANDIR, '2026-09-10 03:00:00');
    DB::table('stage_histories')->where('deal_transaction_id', $legacy->id)->update(['area_snapshot' => null]);
    areaDo($this, BANDUNG_ANDIR, '2026-05-10 03:00:00');
    $r = areaReport($this);
    expect([$r['total'], $r['unverified']])->toBe([0, 0])
        ->and(collect($r['districts'])->sum('count'))->toBe(0)
        ->and(array_column($r['months'], 'total', 'month'))->toBe(['2026-06' => 0, '2026-07' => 0, '2026-08' => 1, '2026-09' => 0, '2026-10' => 0, '2026-11' => 0])
        ->and(count(areaReport($this, '2026-01', '2026-11')['months']))->toBe(11);
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
