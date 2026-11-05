<?php

namespace App\Services;

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\TeamTargetAllocation;
use App\Models\User;
use App\Support\ReportingPeriod;
use App\Support\TargetUnits;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class TeamPerformance
{
    /** @return array<string, mixed> */
    public function build(User $actor, string $period): array
    {
        $canViewManagementTarget = in_array($actor->role, [UserRole::Supervisor, UserRole::BranchManager], true);
        $window = new ReportingPeriod($period);
        $start = $window->start;
        $end = $window->end;
        $historical = $period < now('Asia/Jakarta')->format('Y-m');
        $teams = Team::query()->visibleTo($actor)->orderBy('name')->get();
        $teamIds = $teams->modelKeys();
        $dealsQuery = DealTransaction::query()->visibleInReportsTo($actor);
        $deals = $dealsQuery->with(['sales:id,name,username', 'stageHistories' => fn ($q) => $q->select(['id', 'deal_transaction_id', 'to_stage', 'created_at'])])->get();
        $memberships = TeamMembership::query()->whereIn('team_id', $teamIds)->whereNull('ended_at')
            ->where('role', UserRole::Sales)->whereHas('user', fn ($q) => $q->where('dealer_id', $actor->dealer_id)->where('is_active', true)->where('role', UserRole::Sales))->get();
        $usersQuery = User::query()->where('dealer_id', $actor->dealer_id)->where('role', UserRole::Sales)->where('is_active', true);
        if ($actor->role === UserRole::Sales) {
            $usersQuery->whereKey($actor->id);
        } elseif ($actor->role === UserRole::Supervisor) {
            $usersQuery->whereIn('id', $memberships->pluck('user_id'));
        }
        $users = $usersQuery->orderBy('name')->get();
        $salesTargets = SalesTarget::query()->whereIn('user_id', $users->modelKeys())->whereDate('period', $period.'-01')->get()->keyBy('user_id');
        $teamTargets = TeamTarget::query()->with('allocations.user')->whereIn('team_id', $teamIds)->whereDate('period', $period.'-01')->get()->keyBy('team_id');
        $allocations = TeamTargetAllocation::query()->with(['user', 'target'])->whereHas('target', fn ($q) => $q->whereDate('period', $period.'-01'))
            ->where(function ($q) use ($actor, $teamIds): void {
                if ($actor->role === UserRole::Sales) {
                    $q->where('user_id', $actor->id);
                } else {
                    $q->whereHas('target', fn ($t) => $t->whereIn('team_id', $teamIds));
                }
            })->get();
        $personalUnits = $allocations->groupBy('user_id')->map(fn ($rows) => TargetUnits::number($rows->sum(fn ($a) => TargetUnits::scaled($a->target_units))));
        $managedMemberIds = $memberships->whereIn('team_id', $teamTargets->where('version', '>', 0)->pluck('team_id'))->pluck('user_id');
        foreach ($salesTargets as $id => $legacyTarget) {
            if (! $personalUnits->has($id) && ! $managedMemberIds->contains($id)) {
                $personalUnits->put($id, $legacyTarget->target_units);
            }
        }
        $teamRows = $teams->map(function (Team $team) use ($deals, $memberships, $salesTargets, $teamTargets, $allocations, $period, $start, $end, $historical, $canViewManagementTarget): array {
            $target = $teamTargets->get($team->id);
            $memberIds = $memberships->where('team_id', $team->id)->pluck('user_id')->unique();
            $assignedTargets = $salesTargets->whereIn('user_id', $memberIds);
            $saved = $allocations->filter(fn ($a) => $a->target->team_id === $team->id);
            $managed = $target?->version > 0;
            $salesTotal = $managed ? TargetUnits::number($saved->sum(fn ($a) => TargetUnits::scaled($a->target_units))) : ($assignedTargets->isEmpty() ? null : (int) $assignedTargets->sum('target_units'));
            $activeTotal = $managed ? TargetUnits::number($saved->whereIn('user_id', $memberIds)->sum(fn ($a) => TargetUnits::scaled($a->target_units))) : $salesTotal;
            $benchmark = $target?->benchmark_units === null ? null : TargetUnits::number(TargetUnits::scaled($target->benchmark_units));
            $managementUnits = $canViewManagementTarget ? $target?->target_units : null;
            $teamMetrics = $this->metrics($deals->where('team_id', $team->id), $managementUnits, $period, $start, $end, $historical);

            return array_merge([
                'id' => $team->public_id, 'name' => $team->name, 'is_active' => $team->is_active,
                'sales_target_units' => $salesTotal, 'sales_targets_missing' => $memberIds->diff($managed ? $saved->pluck('user_id') : $assignedTargets->pluck('user_id'))->count(),
                'benchmark_units' => $benchmark, 'active_allocation_units' => $activeTotal,
                'allocation_percent' => $benchmark > 0 && $salesTotal !== null ? round($salesTotal / $benchmark * 100, 2) : null,
                'achievement_percent' => $managementUnits > 0 ? round($teamMetrics['realization_units'] / $managementUnits * 100, 2) : null,
                'benchmark_achievement_percent' => $benchmark > 0 ? round($teamMetrics['realization_units'] / $benchmark * 100, 2) : null,
                'benchmark_gap_units' => $benchmark === null ? null : round($benchmark - $teamMetrics['realization_units'], 4),
                'benchmark_forecast_gap_units' => $benchmark === null || $teamMetrics['forecast_units'] === null ? null : round($benchmark - $teamMetrics['forecast_units'], 4),
                'target_allocation_difference' => $managementUnits !== null && $salesTotal !== null ? $managementUnits - $salesTotal : null,
            ], $teamMetrics);
        })->values();
        $missingTeamTargets = $teams->where('is_active', true)->reject(fn (Team $team): bool => $teamTargets->has($team->id))->count();
        $targetUnits = $actor->role === UserRole::Sales
            ? $personalUnits->get($actor->id)
            : ($canViewManagementTarget && $missingTeamTargets === 0 && ($teams->where('is_active', true)->isNotEmpty() || $teamTargets->isNotEmpty()) ? TargetUnits::number($teamTargets->sum(fn ($t) => TargetUnits::scaled($t->target_units))) : null);
        $salesTotal = $personalUnits->isEmpty() ? null : TargetUnits::number($personalUnits->sum(fn ($n) => TargetUnits::scaled($n)));
        $metrics = $this->metrics($deals, $targetUnits, $period, $start, $end, $historical);
        // Allocations retain their original team and period after membership changes.
        $rowUsers = $users->concat($allocations->pluck('user'))->concat($deals->pluck('sales')->filter())->unique('id')->sortBy('name');
        $performance = $rowUsers->map(fn (User $sales): array => array_merge([
            'id' => $sales->id, 'name' => $sales->name, 'username' => $sales->username,
            'is_current_member' => $users->contains('id', $sales->id),
        ], $this->metrics($deals->where('sales_id', $sales->id), $personalUnits->get($sales->id), $period, $start, $end, $historical)))->values()->all();
        $contributors = $historical ? [] : $deals->filter(fn (DealTransaction $deal): bool => ! $deal->current_stage->isClosed() && $deal->expected_closing_month?->format('Y-m') === $period)
            ->sortByDesc(fn (DealTransaction $deal): float => (float) ($deal->estimated_value ?? 0) * (float) config('forecast.weights.'.$deal->current_stage->value, 0))
            ->take(5)->map(fn (DealTransaction $deal): array => [
                'public_id' => $deal->public_id, 'vehicle_model' => $deal->vehicle_model, 'stage_label' => $deal->current_stage->label(),
                'sales_name' => $deal->sales?->name, 'weighted_value' => round((float) ($deal->estimated_value ?? 0) * (float) config('forecast.weights.'.$deal->current_stage->value, 0), 2),
            ])->values()->all();
        $priorities = ['stagnant' => [], 'closing' => [], 'unread' => []];
        if (in_array($actor->role, [UserRole::Sales, UserRole::Supervisor, UserRole::Admin], true)) {
            $visibleIds = DealTransaction::query()->visibleTo($actor)->pluck('id')->all();
            $actionable = $deals->whereIn('id', $visibleIds);
            $priorities['stagnant'] = $actionable->filter(fn (DealTransaction $deal): bool => $deal->is_stagnant)
                ->sortBy('last_activity_at')->take(5)->map(fn (DealTransaction $deal): array => $this->priority($deal))->values()->all();
            if (! $historical) {
                $priorities['closing'] = $actionable->filter(fn (DealTransaction $deal): bool => ! $deal->current_stage->isClosed() && $deal->expected_closing_month?->format('Y-m') === $period)
                    ->sortByDesc(fn (DealTransaction $deal): float => (float) config('forecast.weights.'.$deal->current_stage->value, 0))
                    ->take(5)->map(fn (DealTransaction $deal): array => $this->priority($deal))->values()->all();
            }
            $priorities['unread'] = $this->unread($actor);
        }

        return [
            'dashboard' => [
                'period' => $period.'-01', 'targetUnits' => $metrics['target_units'],
                'salesTargetUnits' => $salesTotal, 'salesTargetsMissing' => $users->pluck('id')->diff($personalUnits->keys())->count(),
                'teamTargetsMissing' => $missingTeamTargets,
                'targetAllocationDifference' => $canViewManagementTarget && $targetUnits !== null && $salesTotal !== null ? $targetUnits - $salesTotal : null,
                'realizationUnits' => $metrics['realization_units'], 'forecastUnits' => $metrics['forecast_units'],
                'forecastValue' => $metrics['forecast_value'], 'forecastApproved' => (bool) config('forecast.approved', false),
                'gapUnits' => $metrics['gap_units'], 'forecastGapUnits' => $metrics['forecast_gap_units'],
                'stageCounts' => $metrics['stage_counts'], 'stagnantCount' => $deals->filter(fn (DealTransaction $d): bool => $d->is_stagnant)->count(),
                'missingClosingMonthCount' => $metrics['missing_closing_month_count'], 'missingDeliveryHistoryCount' => $metrics['missing_delivery_history_count'],
                'contributors' => $contributors, 'performance' => $performance, 'teams' => $teamRows->all(), 'priorities' => $priorities,
                'unassignedTeam' => in_array($actor->role, [UserRole::Admin, UserRole::BranchManager], true)
                    ? $this->metrics($deals->whereNull('team_id'), null, $period, $start, $end, $historical) : null,
            ],
            'targetPlans' => $actor->role === UserRole::Supervisor ? app(TargetPlans::class)->editor($teams, $memberships->load('user'), $teamTargets, $salesTargets, $period) : [],
            'targetableUsers' => in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true) ? $users->map(fn (User $u): array => ['id' => $u->id, 'name' => $u->name, 'username' => $u->username])->values()->all() : [],
            'targetableTeams' => in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true) ? $teams->where('is_active', true)->map(fn (Team $t): array => ['id' => $t->public_id, 'name' => $t->name])->values()->all() : [],
        ];
    }

    /** @param Collection<int, DealTransaction> $deals
     * @return array<string, mixed>
     */
    private function metrics(Collection $deals, int|float|null $target, string $period, CarbonInterface $start, CarbonInterface $end, bool $historical): array
    {
        $delivered = $deals->filter(fn (DealTransaction $d): bool => $d->stageHistories->contains(fn ($h): bool => $h->to_stage === PipelineStage::Delivery && $h->created_at->gte($start) && $h->created_at->lt($end)));
        $active = $deals->filter(fn (DealTransaction $d): bool => ! $d->current_stage->isClosed());
        $closing = $active->filter(fn (DealTransaction $d): bool => $d->expected_closing_month?->format('Y-m') === $period);
        $weighted = $closing->sum(fn (DealTransaction $d): float => (float) config('forecast.weights.'.$d->current_stage->value, 0));
        $forecast = $historical ? null : round($delivered->count() + $weighted, 2);
        $stageCounts = [];
        foreach (PipelineStage::cases() as $stage) {
            $stageCounts[$stage->value] = $stage === PipelineStage::Delivery ? $delivered->count() : $deals->filter(fn (DealTransaction $d): bool => $d->current_stage === $stage && ($d->expected_closing_month?->format('Y-m') === $period || $d->stageHistories->contains(fn ($h): bool => $h->to_stage === $stage && $h->created_at->gte($start) && $h->created_at->lt($end))))->count();
        }

        return [
            'target_units' => $target, 'realization_units' => $delivered->count(), 'forecast_units' => $forecast,
            'forecast_value' => $historical ? null : round($closing->sum(fn (DealTransaction $d): float => (float) ($d->estimated_value ?? 0) * (float) config('forecast.weights.'.$d->current_stage->value, 0)), 2),
            'gap_units' => $target === null ? null : $target - $delivered->count(),
            'forecast_gap_units' => $target === null || $forecast === null ? null : round($target - $forecast, 4),
            'missing_closing_month_count' => $active->whereNull('expected_closing_month')->count(),
            'missing_delivery_history_count' => $deals->filter(fn (DealTransaction $d): bool => $d->current_stage === PipelineStage::Delivery && ! $d->stageHistories->contains('to_stage', PipelineStage::Delivery))->count(),
            'stage_counts' => $stageCounts,
        ];
    }

    /** @return array<string, mixed> */
    private function priority(DealTransaction $deal): array
    {
        return ['public_id' => $deal->public_id, 'vehicle_model' => $deal->vehicle_model, 'stage' => $deal->current_stage->value,
            'sales_name' => $deal->sales?->name, 'url' => route('transactions.coaching', $deal, false)];
    }

    /** @return list<array<string, mixed>> */
    private function unread(User $actor): array
    {
        if (! in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)) {
            return [];
        }
        $items = [];
        foreach (app(VisibleCoachingNotifications::class)->forUser($actor) as $notification) {
            $comment = DealComment::query()->with('deal')->whereKey($notification->data['comment_id'] ?? 0)->first();
            if ($comment === null || ! $actor->can('create', [DealComment::class, $comment->deal])) {
                continue;
            }
            $items[] = ['id' => $notification->id, 'title' => 'Komentar belum dibaca', 'url' => route('transactions.coaching', $comment->deal, false)];
            if (count($items) === 5) {
                break;
            }
        }

        return $items;
    }
}
