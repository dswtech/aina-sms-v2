<?php

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use App\Services\TargetHistory;
use App\Services\TeamPerformance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->travelTo(CarbonImmutable::parse('2026-11-24 09:00:00', 'Asia/Jakarta')));

function historyDealer(): array
{
    $dealer = Dealer::factory()->create();

    return [
        'dealer' => $dealer,
        'manager' => User::factory()->branchManager()->create(['dealer_id' => $dealer->id]),
        'supervisor' => User::factory()->supervisor()->create(['dealer_id' => $dealer->id]),
        'customer' => Customer::factory()->create(['dealer_id' => $dealer->id]),
    ];
}

function historyTeam(array $f, string $name, ?User $supervisor = null, bool $active = true): Team
{
    $team = Team::factory()->create(['dealer_id' => $f['dealer']->id, 'name' => $name, 'is_active' => $active, 'created_at' => '2026-01-01 00:00:00']);
    if ($supervisor !== null) {
        historyMember($team, $supervisor);
    }

    return $team;
}

function historyMember(Team $team, User $user, ?string $endedAt = null): void
{
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => '2026-01-01 00:00:00', 'ended_at' => $endedAt]);
}

function historySales(array $f, string $name): User
{
    return User::factory()->sales()->create(['dealer_id' => $f['dealer']->id, 'name' => $name]);
}

/** @param  array<int, int|float>  $allocations  user id => units */
function historyPlan(Team $team, string $month, int|float $units, array $allocations = [], int $version = 1): TeamTarget
{
    $target = TeamTarget::create(['team_id' => $team->id, 'period' => $month.'-01', 'target_units' => $units, 'version' => $version,
        'markup_percent' => 0, 'benchmark_units' => $version > 0 ? $units * 1.2 : null]);
    foreach ($allocations as $userId => $allocated) {
        $target->allocations()->create(['user_id' => $userId, 'target_units' => $allocated]);
    }

    return $target;
}

function historyDo(array $f, ?Team $team, User $sales, string $utc): DealTransaction
{
    $deal = DealTransaction::create(['dealer_id' => $f['dealer']->id, 'team_id' => $team?->id, 'customer_id' => $f['customer']->id,
        'sales_id' => $sales->id, 'vehicle_model' => 'Model uji', 'current_stage' => PipelineStage::Do]);
    historyDoEvent($deal, $utc);

    return $deal;
}

function historyDoEvent(DealTransaction $deal, string $utc): StageHistory
{
    return $deal->stageHistories()->create(['from_stage' => 'spk', 'to_stage' => 'do', 'actor_id' => $deal->sales_id, 'created_at' => $utc,
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true]);
}

function historyReport(User $actor, string $from = '2026-06', string $to = '2026-11'): array
{
    return app(TargetHistory::class)->build($actor, $from, $to);
}

it('matches TeamPerformance for every month', function () {
    $f = historyDealer();
    $a = historyTeam($f, 'Tim A', $f['supervisor']);
    $b = historyTeam($f, 'Tim B', $f['supervisor']);
    $c = historyTeam($f, 'Tim C');
    $inactive = historyTeam($f, 'Tim Lama', null, false);
    [$moved, $stay, $left, $legacy] = [historySales($f, 'Pindah'), historySales($f, 'Tetap'), historySales($f, 'Keluar'), historySales($f, 'Legacy')];
    historyMember($a, $moved, '2026-09-15 00:00:00');
    historyMember($b, $moved);
    historyMember($a, $stay);
    historyMember($a, $left, '2026-10-01 00:00:00');
    historyMember($b, $legacy);
    $left->update(['is_active' => false]);
    historyPlan($a, '2026-08', 10, [$moved->id => 4, $stay->id => 4.5, $left->id => 3.5]);
    historyPlan($a, '2026-09', 10, [$moved->id => 6, $stay->id => 6]);
    historyPlan($a, '2026-10', 8, [$stay->id => 9.6]);
    historyPlan($b, '2026-08', 7, version: 0);
    historyPlan($b, '2026-09', 5, [$moved->id => 6]);
    historyPlan($c, '2026-08', 3, [], 0);
    historyPlan($c, '2026-09', 3, [], 0);
    historyPlan($inactive, '2026-08', 2, [], 0);
    foreach (['2026-08', '2026-09', '2026-10'] as $month) {
        SalesTarget::create(['user_id' => $legacy->id, 'period' => $month.'-01', 'target_units' => 4]);
        SalesTarget::create(['user_id' => $moved->id, 'period' => $month.'-01', 'target_units' => 9]);
    }
    historyDo($f, $a, $moved, '2026-08-10 03:00:00');
    historyDo($f, $a, $moved, '2026-09-10 03:00:00');
    historyDo($f, $b, $moved, '2026-09-20 03:00:00');
    historyDo($f, $a, $left, '2026-08-11 03:00:00');
    historyDo($f, $a, $stay, '2026-11-03 03:00:00');
    historyDo($f, $c, $legacy, '2026-10-03 03:00:00');
    historyDo($f, $inactive, $stay, '2026-08-03 03:00:00');
    historyDo($f, null, $stay, '2026-09-04 03:00:00');

    foreach ([$f['supervisor'], $f['manager']] as $actor) {
        $report = historyReport($actor);
        $teams = collect($report['teams'])->keyBy('id');
        foreach ($report['months'] as $month) {
            $expected = app(TeamPerformance::class)->build($actor, $month)['dashboard'];
            foreach ($expected['teams'] as $row) {
                foreach (['target_units', 'benchmark_units', 'realization_units', 'achievement_percent', 'benchmark_achievement_percent'] as $field) {
                    expect($teams[$row['id']]['cells'][$month][$field])->toEqual($row[$field], "$month {$row['name']} $field");
                }
            }
            if ($actor->role === UserRole::BranchManager) {
                expect($report['dealer']['cells'][$month]['target_units'])->toEqual($expected['targetUnits'], "$month dealer")
                    ->and($report['dealer']['cells'][$month]['realization_units'])->toBe($expected['realizationUnits'])
                    ->and($report['unassigned']['cells'][$month]['realization_units'])->toBe($expected['unassignedTeam']['realization_units']);

                continue;
            }
            expect($report['dealer'])->toBeNull()->and($report['unassigned'])->toBeNull();
            $sales = $teams->flatMap(fn (array $team): array => $team['sales'])->groupBy('id');
            foreach ($expected['performance'] as $row) {
                $cells = $sales[$row['id']]->map(fn (array $r): array => $r['cells'][$month]);
                $targets = $cells->pluck('target_units')->reject(fn ($units): bool => $units === null);
                expect($targets->isEmpty() ? null : $targets->sum())->toEqual($row['target_units'], "$month {$row['name']} target")
                    ->and($cells->sum('realization_units'))->toBe($row['realization_units'], "$month {$row['name']} realization");
            }
        }
    }
});

it('keeps a moved sales allocation and realization in the original team', function () {
    $f = historyDealer();
    $a = historyTeam($f, 'Tim A');
    $b = historyTeam($f, 'Tim B');
    $sales = historySales($f, 'Pindah');
    historyMember($a, $sales, '2026-10-01 00:00:00');
    historyMember($b, $sales);
    historyPlan($a, '2026-09', 5, [$sales->id => 6]);
    historyDo($f, $a, $sales, '2026-09-10 03:00:00');

    [$teamA, $teamB] = historyReport($f['manager'])['teams'];
    expect($teamA['sales'][0]['cells']['2026-09'])->toMatchArray(['target_units' => 6, 'realization_units' => 1])
        ->and($teamB['sales'][0]['cells']['2026-09'])->toMatchArray(['target_units' => null, 'realization_units' => 0]);
});

it('counts a cancelled and redone DO once', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim A');
    $deal = historyDo($f, $team, historySales($f, 'Sales'), '2026-11-02 03:00:00');
    $deal->stageHistories()->create(['from_stage' => 'do', 'to_stage' => 'spk', 'actor_id' => $deal->sales_id, 'created_at' => '2026-11-03 03:00:00',
        'reverses_stage_history_id' => $deal->stageHistories()->value('id')]);
    historyDoEvent($deal, '2026-11-04 03:00:00');
    historyDoEvent($deal, '2026-11-05 03:00:00');

    expect(historyReport($f['manager'])['teams'][0]['cells']['2026-11']['realization_units'])->toBe(1);
});

it('buckets DO events by Jakarta month', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim A');
    $sales = historySales($f, 'Sales');
    historyDo($f, $team, $sales, '2026-10-31 16:59:59');
    historyDo($f, $team, $sales, '2026-10-31 17:00:00');

    $cells = historyReport($f['manager'])['teams'][0]['cells'];
    expect($cells['2026-10']['realization_units'])->toBe(1)->and($cells['2026-11']['realization_units'])->toBe(1);
});

it('averages the last three completed months by total units', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim A');
    $sales = historySales($f, 'Sales');
    foreach (['2026-07' => [1, 9], '2026-08' => [10, 5], '2026-09' => [null, 4], '2026-10' => [20, 9], '2026-11' => [10, 20]] as $month => [$target, $done]) {
        if ($target !== null) {
            historyPlan($team, $month, $target);
        }
        for ($i = 0; $i < $done; $i++) {
            historyDo($f, $team, $sales, $month.'-10 03:00:00');
        }
    }
    $report = historyReport($f['manager']);
    expect($report['averageMonths'])->toBe(['2026-08', '2026-09', '2026-10'])
        ->and($report['teams'][0]['average'])->toEqual(['achievement_percent' => 46.67, 'benchmark_achievement_percent' => 38.89])
        ->and($report['dealer']['average']['achievement_percent'])->toEqual(46.67)
        ->and($report['unassigned']['average']['achievement_percent'])->toBeNull();
});

it('distinguishes unset from zero', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim A');
    historyPlan($team, '2026-10', 0);
    $cells = historyReport($f['manager'])['teams'][0]['cells'];
    expect($cells['2026-10'])->toMatchArray(['target_units' => 0, 'achievement_percent' => null])
        ->and($cells['2026-11'])->toMatchArray(['target_units' => null, 'achievement_percent' => null]);
});

it('reports filled and required teams for the dealer', function () {
    $f = historyDealer();
    historyPlan(historyTeam($f, 'Tim A'), '2026-11', 5);
    historyTeam($f, 'Tim B')->forceFill(['created_at' => '2026-11-02 00:00:00'])->save();
    historyPlan(Team::query()->where('name', 'Tim A')->sole(), '2026-10', 4);
    $cells = historyReport($f['manager'])['dealer']['cells'];
    expect($cells['2026-11'])->toMatchArray(['target_units' => null, 'teams_filled' => 1, 'teams_required' => 2])
        ->and($cells['2026-10'])->toMatchArray(['target_units' => 4, 'teams_filled' => 1, 'teams_required' => 1]);
});

it('never exposes another dealer or another supervisor team', function () {
    $f = historyDealer();
    $other = historyDealer();
    $mine = historyTeam($f, 'Tim A', $f['supervisor']);
    $theirs = historyTeam($f, 'Tim B');
    $foreign = historyTeam($other, 'Tim Asing', $other['supervisor']);
    foreach ([[$f, $mine], [$f, $theirs], [$other, $foreign]] as [$owner, $team]) {
        historyPlan($team, '2026-11', 5);
        historyDo($owner, $team, historySales($owner, 'Sales '.$team->name), '2026-11-02 03:00:00');
    }
    expect(collect(historyReport($f['supervisor'])['teams'])->pluck('name')->all())->toBe(['Tim A']);
    $report = historyReport($f['manager']);
    expect(collect($report['teams'])->pluck('name')->all())->toBe(['Tim A', 'Tim B'])
        ->and($report['dealer']['cells']['2026-11']['realization_units'])->toBe(2);
});

it('lists an inactive team only when it has history in the range', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim Lama', null, false);
    historyPlan($team, '2026-06', 5);
    expect(historyReport($f['manager'])['teams'])->toHaveCount(1)
        ->and(historyReport($f['manager'], '2026-07')['teams'])->toBe([]);
});

it('runs a constant number of queries', function () {
    $f = historyDealer();
    $team = historyTeam($f, 'Tim A');
    $sales = historySales($f, 'Sales');
    historyMember($team, $sales);
    for ($month = CarbonImmutable::parse('2024-12-10 03:00:00'); $month->format('Y-m') <= '2026-11'; $month = $month->addMonth()) {
        historyPlan($team, $month->format('Y-m'), 5, [$sales->id => 6]);
        historyDo($f, $team, $sales, $month->toDateTimeString());
    }
    $count = function (string $from) use ($f): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        historyReport($f['manager'], $from);

        return count(DB::getQueryLog());
    };
    expect($count('2024-12'))->toBe($count('2026-11'));
});

it('serves the report to supervisors and branch managers only', function () {
    $f = historyDealer();
    foreach ([$f['supervisor'], $f['manager']] as $actor) {
        $this->actingAs($actor)->get('/analytics/target-history')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->component('analytics/target-history')->where('report.from', '2026-06')->where('report.to', '2026-11'));
    }
    foreach ([User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]), historySales($f, 'Sales')] as $actor) {
        $this->actingAs($actor)->get('/analytics/target-history')->assertForbidden();
    }
});

it('validates the report range', function (string $query, string $field) {
    $this->actingAs(historyDealer()['manager'])->get('/analytics/target-history?'.$query)->assertSessionHasErrors($field);
})->with([
    ['from=2026-11&to=2026-10', 'to'],
    ['from=2024-01&to=2026-11', 'to'],
    ['from=bad', 'from'],
]);
