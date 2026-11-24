<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\SalesTarget;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\TeamTargetAllocation;
use App\Models\User;
use App\Support\ReportingPeriod;
use App\Support\TargetUnits;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Monthly target attainment over a range. Team, dealer and unassigned numbers equal TeamPerformance::build for each month.
 */
class TargetHistory
{
    /** @return array<string, mixed> */
    public function build(User $actor, string $from, string $to): array
    {
        $window = new ReportingPeriod($from, $to);
        $months = [];
        for ($month = CarbonImmutable::createFromFormat('!Y-m', $from); $month->format('Y-m') <= $to; $month = $month->addMonth()) {
            $months[] = $month->format('Y-m');
        }
        $currentMonth = now('Asia/Jakarta')->format('Y-m');
        $averageMonths = array_slice(array_values(array_filter($months, fn (string $m): bool => $m < $currentMonth)), -3);
        $isBranchManager = $actor->role === UserRole::BranchManager;

        $teams = Team::query()->visibleTo($actor)->orderBy('name')->get();
        $targets = TeamTarget::query()->with('allocations')->whereIn('team_id', $teams->modelKeys())
            ->whereDate('period', '>=', $from.'-01')->whereDate('period', '<=', $to.'-01')->get()
            ->groupBy(fn (TeamTarget $t): string => CarbonImmutable::parse($t->period)->format('Y-m'))->map(fn (Collection $rows): Collection => $rows->keyBy('team_id'));
        $memberships = TeamMembership::query()->whereIn('team_id', $teams->modelKeys())->whereNull('ended_at')->where('role', UserRole::Sales)
            ->whereHas('user', fn ($q) => $q->where('dealer_id', $actor->dealer_id)->where('is_active', true)->where('role', UserRole::Sales))->get();
        $salesTargets = SalesTarget::query()->whereIn('user_id', $memberships->pluck('user_id'))
            ->whereDate('period', '>=', $from.'-01')->whereDate('period', '<=', $to.'-01')->get()
            ->groupBy(fn (SalesTarget $t): string => CarbonImmutable::parse($t->period)->format('Y-m'))->map(fn (Collection $rows): Collection => $rows->keyBy('user_id'));

        // One entry per deal and Jakarta month; grouped in PHP so SQLite and PostgreSQL agree.
        $done = StageHistory::query()->realizedDo()->where('created_at', '>=', $window->start)->where('created_at', '<', $window->end)
            ->whereHas('dealTransaction', fn ($q) => $q->visibleInReportsTo($actor))
            ->with('dealTransaction:id,team_id,sales_id')->get(['deal_transaction_id', 'created_at'])
            ->map(fn (StageHistory $row): array => [
                'deal' => $row->deal_transaction_id, 'month' => $row->created_at->setTimezone('Asia/Jakarta')->format('Y-m'),
                'team' => $row->dealTransaction->team_id, 'sales' => $row->dealTransaction->sales_id,
            ])->unique(fn (array $row): string => $row['deal'].'|'.$row['month']);
        $teamDone = $done->countBy(fn (array $row): string => $row['month'].'|'.$row['team']);
        $salesDone = $done->countBy(fn (array $row): string => $row['month'].'|'.$row['team'].'|'.$row['sales']);
        $dealerDone = $done->countBy('month');

        $salesUnits = $this->salesUnits($months, $targets, $salesTargets, $memberships);
        $salesIds = fn (Team $team): Collection => $memberships->where('team_id', $team->id)->pluck('user_id')
            ->merge($targets->flatMap(fn (Collection $rows): Collection => $rows->get($team->id)->allocations ?? collect())->pluck('user_id'))
            ->merge($done->where('team', $team->id)->pluck('sales'))->unique();
        $users = User::query()->whereKey($teams->flatMap($salesIds)->unique()->all())->orderBy('name')->get(['id', 'name']);

        $teamRows = $teams->filter(fn (Team $team): bool => $team->is_active
            || $targets->contains(fn (Collection $rows): bool => $rows->has($team->id)) || $done->contains('team', $team->id))
            ->map(function (Team $team) use ($months, $averageMonths, $targets, $teamDone, $salesDone, $salesUnits, $users, $salesIds): array {
                $ids = $salesIds($team);

                return [...$this->row($team->public_id, $team->name, $months, $averageMonths, function (string $month) use ($team, $targets, $teamDone): array {
                    $target = $targets->get($month)?->get($team->id);

                    return $this->cell($target?->target_units, $target?->benchmark_units === null ? null : TargetUnits::number(TargetUnits::scaled($target->benchmark_units)),
                        $teamDone->get($month.'|'.$team->id, 0));
                }), 'is_active' => $team->is_active, 'sales' => $users->whereIn('id', $ids)->map(fn (User $sales): array => $this->row(
                    $sales->id, $sales->name, $months, $averageMonths,
                    fn (string $month): array => $this->cell($salesUnits[$month][$team->id][$sales->id] ?? null, null, $salesDone->get($month.'|'.$team->id.'|'.$sales->id, 0)),
                ))->values()->all()];
            })->values()->all();

        return [
            'from' => $from, 'to' => $to, 'currentMonth' => $currentMonth, 'months' => $months, 'averageMonths' => $averageMonths,
            'dealer' => $isBranchManager ? $this->row('dealer', 'Total dealer', $months, $averageMonths, function (string $month) use ($teams, $targets, $dealerDone): array {
                $monthTargets = $targets->get($month, collect());
                // Same completeness rule as TeamPerformance::build.
                $required = $teams->where('is_active', true)->where('created_at', '<', (new ReportingPeriod($month))->end);
                $filled = $required->filter(fn (Team $team): bool => $monthTargets->has($team->id))->count();
                $complete = $filled === $required->count() && $monthTargets->isNotEmpty();

                return [...$this->cell($complete ? TargetUnits::number($monthTargets->sum(fn (TeamTarget $t): int => TargetUnits::scaled($t->target_units))) : null, null, $dealerDone->get($month, 0)),
                    'teams_filled' => $filled, 'teams_required' => $required->count()];
            }) : null,
            'unassigned' => $isBranchManager ? $this->row('unassigned', 'Transaksi tanpa tim', $months, $averageMonths,
                fn (string $month): array => $this->cell(null, null, $teamDone->get($month.'|', 0))) : null,
            'teams' => $teamRows,
        ];
    }

    /**
     * Personal targets: the allocation in that team's plan, else the legacy target in the Sales' current team.
     *
     * @param  list<string>  $months
     * @param  Collection<array-key, EloquentCollection<array-key, TeamTarget>>  $targets
     * @param  Collection<array-key, EloquentCollection<array-key, SalesTarget>>  $salesTargets
     * @param  Collection<int, TeamMembership>  $memberships
     * @return array<string, array<int, array<int, int|float>>> month → team id → user id → units
     */
    private function salesUnits(array $months, Collection $targets, Collection $salesTargets, Collection $memberships): array
    {
        $units = [];
        foreach ($months as $month) {
            $monthTargets = $targets->get($month, collect());
            $allocations = $monthTargets->flatMap(fn (TeamTarget $t): array => $t->allocations
                ->map(fn (TeamTargetAllocation $a): array => [$t->team_id, $a->user_id, $a->target_units])->all());
            foreach ($allocations as [$teamId, $userId, $value]) {
                $units[$month][$teamId][$userId] = TargetUnits::number(TargetUnits::scaled($value));
            }
            $managed = $memberships->whereIn('team_id', $monthTargets->where('version', '>', 0)->pluck('team_id'))->pluck('user_id')
                ->merge($allocations->pluck(1));
            foreach ($salesTargets->get($month, collect()) as $userId => $legacy) {
                if (! $managed->contains($userId)) {
                    $units[$month][$memberships->firstWhere('user_id', $userId)->team_id][$userId] = $legacy->target_units;
                }
            }
        }

        return $units;
    }

    /**
     * @param  list<string>  $months
     * @param  list<string>  $averageMonths
     * @param  \Closure(string): array<string, mixed>  $cell
     * @return array<string, mixed>
     */
    private function row(int|string $id, string $name, array $months, array $averageMonths, \Closure $cell): array
    {
        $cells = [];
        foreach ($months as $month) {
            $cells[$month] = $cell($month);
        }
        $averaged = collect($cells)->only($averageMonths);
        $average = function (string $field) use ($averaged): ?float {
            $filled = $averaged->filter(fn (array $c): bool => $c[$field] > 0);

            return $this->percent($filled->sum('realization_units'), $filled->sum($field));
        };

        return ['id' => $id, 'name' => $name, 'cells' => $cells, 'average' => [
            'achievement_percent' => $average('target_units'), 'benchmark_achievement_percent' => $average('benchmark_units'),
        ]];
    }

    /** @return array<string, int|float|null> */
    private function cell(int|float|null $target, int|float|null $benchmark, int $realized): array
    {
        return ['target_units' => $target, 'benchmark_units' => $benchmark, 'realization_units' => $realized,
            'achievement_percent' => $this->percent($realized, $target), 'benchmark_achievement_percent' => $this->percent($realized, $benchmark)];
    }

    private function percent(int $realized, int|float|null $target): ?float
    {
        return $target > 0 ? round($realized / $target * 100, 2) : null;
    }
}
