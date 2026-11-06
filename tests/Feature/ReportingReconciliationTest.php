<?php

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function g03Team(Dealer $dealer): array
{
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    foreach ([$supervisor, $sales] as $user) {
        TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => '2026-10-01 00:00:00']);
    }
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'notes' => 'JANGAN_KIRIM_CATATAN']);

    return compact('dealer', 'team', 'supervisor', 'sales', 'customer');
}

function g03Deal(array $f, string $source, string $createdAt, string $eventAt, PipelineStage $stage = PipelineStage::Do): DealTransaction
{
    $deal = DealTransaction::create([
        'dealer_id' => $f['dealer']->id, 'team_id' => $f['team']->id, 'sales_id' => $f['sales']->id,
        'customer_id' => $f['customer']->id, 'vehicle_model' => 'Model, uji', 'source' => $source,
        'current_stage' => $stage, 'expected_closing_month' => '2026-11-01',
    ]);
    $deal->forceFill(['created_at' => Carbon::parse($createdAt, 'UTC')])->save();
    $deal->stageHistories()->create([
        'to_stage' => $stage, 'actor_id' => $f['sales']->id, 'created_at' => $eventAt,
        'po_confirmed' => $stage === PipelineStage::Do, 'dp_confirmed' => $stage === PipelineStage::Do,
        'unit_confirmed' => $stage === PipelineStage::Do,
    ]);

    return $deal;
}

function g03Ledger(): array
{
    $f = g03Team(Dealer::factory()->create());
    $other = g03Team($f['dealer']);
    $foreign = g03Team(Dealer::factory()->create());
    $old = g03Deal($f, 'old_lead', '2026-10-01 00:00:00', '2026-10-31 17:00:00');
    $old->stageHistories()->create([
        'to_stage' => 'do', 'actor_id' => $f['sales']->id, 'created_at' => '2026-11-02 00:00:00',
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);
    $old->update(['updated_at' => '2026-12-10 00:00:00']);
    $active = g03Deal($f, 'walk_in', '2026-10-31 17:00:00', '2026-11-02 00:00:00', PipelineStage::Do);
    foreach (['2026-11-03 00:00:00', '2026-11-04 00:00:00'] as $at) {
        $active->stageHistories()->create(['to_stage' => 'spk', 'actor_id' => $f['sales']->id, 'created_at' => $at]);
    }
    $last = g03Deal($f, 'walk_in', '2026-11-30 16:59:59', '2026-11-30 16:59:59');
    $last->update(['current_stage' => PipelineStage::Delivery]);
    $last->stageHistories()->create(['to_stage' => 'delivery', 'actor_id' => $f['sales']->id, 'created_at' => '2026-11-30 17:00:00']);
    g03Deal($f, 'next_month', '2026-11-30 17:00:00', '2026-11-30 17:00:00');
    g03Deal($f, 'prior_month', '2026-10-31 16:59:59', '2026-10-31 16:59:59');
    g03Deal($other, 'other_team', '2026-11-05 00:00:00', '2026-11-06 00:00:00');
    g03Deal($foreign, 'foreign_dealer', '2026-11-05 00:00:00', '2026-11-06 00:00:00');

    return compact('f', 'other', 'foreign', 'old', 'active', 'last');
}

it('reconciles unique Jakarta DO events between dashboard and achievement analysis', function (string $role) {
    $this->travelTo(Carbon::parse('2026-11-30 16:59:59', 'UTC'));
    $ledger = g03Ledger();
    $f = $ledger['f'];
    $actor = $role === 'supervisor' ? $f['supervisor'] : User::factory()->role(UserRole::from($role))->create(['dealer_id' => $f['dealer']->id]);
    $expected = $role === 'supervisor' ? 3 : 4;
    $this->actingAs($actor)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.realizationUnits', $expected)->where('dashboard.stageCounts.do', $expected)
        ->where('dashboard.stageCounts.delivery', 0));
    $this->get('/analytics?period=2026-11&mode=achievement')->assertInertia(fn (Assert $p) => $p
        ->where('analytics.sources', fn ($rows): bool => collect($rows)->sum('do') === $expected)
        ->where('analytics.models.0.do', $expected)
        ->where('analytics.sources', fn ($rows): bool => ! collect($rows)->pluck('source')->intersect(['next_month', 'prior_month', 'foreign_dealer'])->count()));
})->with(['supervisor', 'branch_manager', 'admin']);

it('omits a cancelled DO and counts its replacement only in the new Jakarta month', function () {
    $f = g03Team(Dealer::factory()->create());
    $deal = g03Deal($f, 'walk_in', '2026-11-29 00:00:00', '2026-11-30 16:59:59');
    $original = $deal->stageHistories()->sole();
    $deal->stageHistories()->create([
        'from_stage' => 'do', 'to_stage' => 'spk', 'actor_id' => $f['sales']->id,
        'created_at' => '2026-11-30 17:00:00', 'reverses_stage_history_id' => $original->id,
    ]);
    $deal->stageHistories()->create([
        'from_stage' => 'spk', 'to_stage' => 'do', 'actor_id' => $f['sales']->id,
        'created_at' => '2026-11-30 17:00:01', 'po_confirmed' => true,
        'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);

    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')
        ->assertInertia(fn (Assert $p) => $p->where('dashboard.realizationUnits', 0));
    $this->get('/analytics?period=2026-11&mode=achievement')
        ->assertInertia(fn (Assert $p) => $p->where('analytics.sources', [])->where('analytics.drilldown', []));
    $this->get('/dashboard?period=2026-12')
        ->assertInertia(fn (Assert $p) => $p->where('dashboard.realizationUnits', 1));
    $this->get('/analytics?period=2026-12&mode=achievement')
        ->assertInertia(fn (Assert $p) => $p
            ->where('analytics.sources.0.do', 1)->where('analytics.sources.0.spk', 0)
            ->where('analytics.sources.0.delivery', 0));
});

it('excludes DO history without a complete checklist', function () {
    $f = g03Team(Dealer::factory()->create());
    $deal = g03Deal($f, 'walk_in', '2026-11-05 00:00:00', '2026-11-07 00:00:00');
    $deal->stageHistories()->update(['unit_confirmed' => false]);

    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')
        ->assertInertia(fn (Assert $p) => $p->where('dashboard.realizationUnits', 0)
            ->where('dashboard.missingDoHistoryCount', 1));
    $this->get('/analytics?period=2026-11&mode=achievement')
        ->assertInertia(fn (Assert $p) => $p->where('analytics.sources', []));
    $this->get('/analytics?period=2026-11&mode=acquisition')
        ->assertInertia(fn (Assert $p) => $p->where('analytics.sources.0.do', 0)
            ->where('analytics.sources.0.conversion', 0));
});

it('uses the Jakarta acquisition cohort and distinct stage progress with a clear denominator', function () {
    $ledger = g03Ledger();
    $this->actingAs($ledger['f']['supervisor'])->get('/analytics?period=2026-11&mode=acquisition&dimension=source&value=walk_in')
        ->assertInertia(fn (Assert $p) => $p
            ->has('analytics.sources', 1)->where('analytics.sources.0.source', 'walk_in')
            ->where('analytics.sources.0.total', 2)->where('analytics.sources.0.spk', 1)
            ->where('analytics.sources.0.do', 2)->where('analytics.sources.0.delivery', 1)
            ->where('analytics.sources.0.share', 100)->where('analytics.sources.0.conversion', 100)
            ->has('analytics.drilldown', 2)->where('analytics.drilldown', fn ($rows): bool => collect($rows)->pluck('public_id')->sort()->values()->all() === collect([$ledger['active']->public_id, $ledger['last']->public_id])->sort()->values()->all()));
});

it('keeps reporting attribution on the recorded team after a sales transfer', function () {
    $ledger = g03Ledger();
    $f = $ledger['f'];
    $other = $ledger['other'];
    $f['sales']->activeTeamMemberships()->update(['ended_at' => now()]);
    TeamMembership::create(['team_id' => $other['team']->id, 'user_id' => $f['sales']->id, 'role' => 'sales', 'started_at' => now()]);
    foreach ([[$f['supervisor'], 3], [$other['supervisor'], 1]] as [$actor, $count]) {
        $this->actingAs($actor)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p->where('dashboard.realizationUnits', $count));
        $this->get('/analytics?period=2026-11&mode=achievement')->assertInertia(fn (Assert $p) => $p
            ->where('analytics.sources', fn ($rows): bool => collect($rows)->sum('do') === $count));
    }
});

it('revokes report visibility after supervisor membership ends or the team is inactive', function (string $change) {
    $ledger = g03Ledger();
    $f = $ledger['f'];
    if ($change === 'membership') {
        $f['supervisor']->activeTeamMemberships()->update(['ended_at' => now()]);
    } else {
        $f['team']->update(['is_active' => false]);
    }
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p->where('dashboard.realizationUnits', 0));
    $this->get('/analytics?period=2026-11&mode=achievement')->assertInertia(fn (Assert $p) => $p->where('analytics.sources', [])->where('analytics.drilldown', []));
})->with(['membership', 'team']);

it('defaults reporting to the Jakarta month when UTC is still in the previous month', function () {
    $this->travelTo(Carbon::parse('2026-11-30 17:01:00', 'UTC'));
    $f = g03Team(Dealer::factory()->create());
    $this->actingAs($f['supervisor'])->get('/analytics')->assertInertia(fn (Assert $p) => $p->where('analytics.period', '2026-12'));
});

it('preserves persisted UTC instants regardless of the database server timezone', function () {
    $f = g03Team(Dealer::factory()->create());
    $deal = g03Deal($f, 'timezone_check', '2026-10-31 17:00:00', '2026-11-30 16:59:59');
    expect($deal->fresh()->created_at->utc()->format('Y-m-d H:i:s'))->toBe('2026-10-31 17:00:00')
        ->and($deal->stageHistories()->sole()->created_at->utc()->format('Y-m-d H:i:s'))->toBe('2026-11-30 16:59:59');
});

it('reconciles team sales targets by recipient user rather than target record ids', function () {
    $f = g03Team(Dealer::factory()->create());
    SalesTarget::create(['user_id' => $f['sales']->id, 'period' => '2026-11-01', 'target_units' => 85]);
    TeamTarget::create(['team_id' => $f['team']->id, 'period' => '2026-11-01', 'target_units' => 95]);
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.salesTargetUnits', 85)->where('dashboard.teams.0.sales_target_units', 85)
        ->where('dashboard.teams.0.sales_targets_missing', 0)->where('dashboard.teams.0.target_allocation_difference', 10));
});

it('rejects invalid report periods and modes for both screen and CSV', function (string $path) {
    $f = g03Team(Dealer::factory()->create());
    $this->actingAs($f['supervisor'])->get($path.'?period=2026-13')->assertSessionHasErrors('period');
    $this->get($path.'?period=2026-11&mode=unknown')->assertSessionHasErrors('mode');
})->with(['/analytics', '/analytics/export.csv']);

it('reconciles filtered CSV to screen totals and never accepts caller supplied dealer or team scopes', function () {
    $ledger = g03Ledger();
    $f = $ledger['f'];
    $query = http_build_query(['period' => '2026-11', 'mode' => 'acquisition', 'dealer_id' => $ledger['foreign']['dealer']->id, 'team_id' => $ledger['other']['team']->id]);
    $response = $this->actingAs($f['supervisor'])->get('/analytics/export.csv?'.$query)->assertOk();
    $csv = $response->streamedContent();
    $rows = array_map(fn (string $row): array => str_getcsv($row, escape: ''), explode("\n", trim($csv)));
    $source = collect($rows)->first(fn (array $row): bool => $row[0] === 'walk_in');
    expect($source)->toBe(['walk_in', '2', '100', '1', '2', '1', '100'])
        ->and($csv)->not->toContain('foreign_dealer', 'other_team', 'JANGAN_KIRIM_CATATAN', $f['customer']->phone);
});
