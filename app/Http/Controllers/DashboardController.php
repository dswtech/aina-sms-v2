<?php

namespace App\Http\Controllers;

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        $period = Carbon::now()->startOfMonth();

        $visibleDeals = DealTransaction::query()->visibleTo($actor);

        $targetUnits = 0;
        if ($actor->role === UserRole::Sales) {
            $targetUnits = (int) (SalesTarget::query()
                ->where('user_id', $actor->id)
                ->whereYear('period', $period->year)
                ->whereMonth('period', $period->month)
                ->value('target_units') ?? 0);
        } elseif ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $salesIds = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->whereNull('ended_at')
                ->pluck('user_id');
            $targetUnits = (int) SalesTarget::query()
                ->whereIn('user_id', $salesIds)
                ->whereYear('period', $period->year)
                ->whereMonth('period', $period->month)
                ->sum('target_units');
        } else {
            $targetUnits = (int) SalesTarget::query()
                ->whereYear('period', $period->year)
                ->whereMonth('period', $period->month)
                ->sum('target_units');
        }

        $realizationUnits = (clone $visibleDeals)
            ->where('current_stage', PipelineStage::Delivery)
            ->whereYear('updated_at', $period->year)
            ->whereMonth('updated_at', $period->month)
            ->count();

        /** @var array<string, float|int> $weights */
        $weights = config('forecast.weights', []);
        $forecastValue = 0.0;
        $weightedUnits = 0.0;
        $contributors = [];
        foreach ((clone $visibleDeals)
            ->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value])
            ->with(['customer:id,name', 'sales:id,name'])
            ->get() as $deal) {
            $weight = (float) ($weights[$deal->current_stage->value] ?? 0.0);
            $weightedValue = ((float) ($deal->estimated_value ?? 0)) * $weight;
            $forecastValue += $weightedValue;
            $weightedUnits += $weight;
            $contributors[] = [
                'public_id' => $deal->public_id,
                'vehicle_model' => $deal->vehicle_model,
                'stage_label' => $deal->current_stage->label(),
                'sales_name' => $deal->sales?->name,
                'weighted_value' => round($weightedValue, 2),
            ];
        }

        usort($contributors, fn (array $left, array $right): int => $right['weighted_value'] <=> $left['weighted_value']);
        $contributors = array_slice($contributors, 0, 5);

        $stageCounts = [];
        foreach (PipelineStage::cases() as $stage) {
            $stageCounts[$stage->value] = (clone $visibleDeals)
                ->where('current_stage', $stage->value)
                ->count();
        }

        $stagnantCount = (clone $visibleDeals)
            ->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value])
            ->where('last_activity_at', '<=', now()->subDays(3))
            ->count();

        $targetableUsers = collect();
        if ($actor->role === UserRole::Sales) {
            $targetableUsers = collect([$actor]);
        } elseif ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $salesIds = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('role', UserRole::Sales->value)
                ->whereNull('ended_at')
                ->pluck('user_id');
            $targetableUsers = User::query()->whereIn('id', $salesIds)->where('is_active', true)->orderBy('name')->get();
        } elseif ($actor->role === UserRole::Admin) {
            $targetableUsers = User::query()
                ->where('dealer_id', $actor->dealer_id)
                ->where('role', UserRole::Sales)
                ->where('is_active', true)
                ->orderBy('name')
                ->get();
        }

        $performance = $targetableUsers->map(function (User $sales) use ($period): array {
            $target = (int) (SalesTarget::query()
                ->where('user_id', $sales->id)
                ->whereYear('period', $period->year)
                ->whereMonth('period', $period->month)
                ->value('target_units') ?? 0);
            $deals = DealTransaction::query()->where('sales_id', $sales->id);
            $realization = (clone $deals)
                ->where('current_stage', PipelineStage::Delivery)
                ->whereYear('updated_at', $period->year)
                ->whereMonth('updated_at', $period->month)
                ->count();

            return [
                'id' => $sales->id,
                'name' => $sales->name,
                'username' => $sales->username,
                'target_units' => $target,
                'realization_units' => $realization,
                'gap_units' => max(0, $target - $realization),
            ];
        })->values()->all();

        return Inertia::render('dashboard', [
            'dashboard' => [
                'period' => $period->toDateString(),
                'targetUnits' => $targetUnits,
                'realizationUnits' => $realizationUnits,
                'forecastUnits' => round($realizationUnits + $weightedUnits, 1),
                'forecastValue' => round($forecastValue, 2),
                'forecastApproved' => (bool) config('forecast.approved', false),
                'gapUnits' => $targetUnits - $realizationUnits,
                'stageCounts' => $stageCounts,
                'stagnantCount' => $stagnantCount,
                'contributors' => $contributors,
                'performance' => $performance,
            ],
            'targetableUsers' => $targetableUsers->map(fn (User $sales): array => [
                'id' => $sales->id,
                'name' => $sales->name,
                'username' => $sales->username,
            ])->values()->all(),
        ]);
    }
}
