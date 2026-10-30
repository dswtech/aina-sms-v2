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
    private const STAGE_WEIGHTS = [
        'lead' => 0.10,
        'prospect' => 0.25,
        'hot_prospect' => 0.50,
        'spk' => 0.75,
        'do' => 0.90,
    ];

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
                ->where('period', $period->toDateString())
                ->value('target_units') ?? 0);
        } elseif ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $salesIds = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->whereNull('ended_at')
                ->pluck('user_id');
            $targetUnits = (int) SalesTarget::query()
                ->whereIn('user_id', $salesIds)
                ->where('period', $period->toDateString())
                ->sum('target_units');
        } else {
            $targetUnits = (int) SalesTarget::query()
                ->where('period', $period->toDateString())
                ->sum('target_units');
        }

        $realizationUnits = (clone $visibleDeals)
            ->where('current_stage', PipelineStage::Delivery)
            ->whereYear('updated_at', $period->year)
            ->whereMonth('updated_at', $period->month)
            ->count();

        $forecast = 0.0;
        foreach ((clone $visibleDeals)->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value])->get() as $deal) {
            $weight = self::STAGE_WEIGHTS[$deal->current_stage->value] ?? 0.0;
            $forecast += ((float) ($deal->estimated_value ?? 0)) * $weight;
        }

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

        $targetableUsers = [];
        if ($actor->role === \App\Enums\UserRole::Sales) {
            $targetableUsers = [$actor];
        } elseif ($actor->role === \App\Enums\UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $salesIds = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->whereNull('ended_at')
                ->pluck('user_id');
            $targetableUsers = User::query()->whereIn('id', $salesIds)->orderBy('name')->get(['id', 'name', 'username'])->all();
        } elseif (in_array($actor->role, [\App\Enums\UserRole::Admin, \App\Enums\UserRole::BranchManager], true)) {
            $targetableUsers = User::query()->where('role', \App\Enums\UserRole::Sales->value)->where('dealer_id', $actor->dealer_id)->orderBy('name')->get(['id', 'name', 'username'])->all();
        }

        return Inertia::render('dashboard', [
            'dashboard' => [
                'period' => $period->toDateString(),
                'targetUnits' => $targetUnits,
                'realizationUnits' => $realizationUnits,
                'forecastValue' => round($forecast, 2),
                'gapUnits' => $targetUnits - $realizationUnits,
                'stageCounts' => $stageCounts,
                'stagnantCount' => $stagnantCount,
            ],
            'targetableUsers' => $targetableUsers,
        ]);
    }
}
