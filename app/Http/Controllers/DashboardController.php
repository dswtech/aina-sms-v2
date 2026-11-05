<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TeamPerformance;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'dashboard');
    }

    public function targets(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'targets/index');
    }

    public function teams(Request $request, TeamPerformance $performance): Response
    {
        return $this->render($request, $performance, 'team-performance/index');
    }

    private function render(Request $request, TeamPerformance $performance, string $component): Response
    {
        $validated = $request->validate(['period' => ['sometimes', 'required', 'date_format:Y-m']]);
        /** @var User $actor */
        $actor = $request->user();

        return Inertia::render($component, $performance->build($actor, $validated['period'] ?? now('Asia/Jakarta')->format('Y-m')));
    }
}
