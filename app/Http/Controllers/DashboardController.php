<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\StageAchievements;
use App\Services\TeamPerformance;
use App\Support\ReportingPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, TeamPerformance $performance, StageAchievements $achievements): Response
    {
        $props = $this->props($request, $performance);
        $actor = $request->user();
        $window = new ReportingPeriod(substr($props['dashboard']['period'], 0, 7));
        $props['dashboard']['stageAchievement'] = $actor->role === UserRole::Supervisor ? $achievements->bySales($actor, $window) : null;

        return Inertia::render('dashboard', $props);
    }

    public function targets(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'targets/index');
    }

    public function targetPlans(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'targets/plans');
    }

    public function teams(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'team-performance/index');
    }

    private function render(Request $request, TeamPerformance $performance, string $component): Response
    {
        return Inertia::render($component, $this->props($request, $performance));
    }

    /** @return array<string, mixed> */
    private function props(Request $request, TeamPerformance $performance): array
    {
        $validated = $request->validate(['period' => ['sometimes', 'required', 'date_format:Y-m']]);
        /** @var User $actor */
        $actor = $request->user();

        return $performance->build($actor, $validated['period'] ?? now('Asia/Jakarta')->format('Y-m'));
    }
}
