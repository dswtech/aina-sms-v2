<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\StageAchievements;
use App\Services\TargetHistory;
use App\Services\TransactionReports;
use App\Support\ReportingPeriod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Analysis reports. Roles are gated on the routes. */
class ReportController extends Controller
{
    /** @return array{0: User, 1: string, 2: string} */
    private function range(Request $request, int $monthsBack = 0): array
    {
        /** @var User $actor */
        $actor = $request->user();
        $month = now('Asia/Jakarta')->startOfMonth();
        $request->merge(['from' => $request->input('from', $month->copy()->subMonths($monthsBack)->format('Y-m')), 'to' => $request->input('to', $request->input('from', $month->format('Y-m')))]);
        $validated = $request->validate([
            'from' => ['required', 'date_format:Y-m'],
            'to' => ['required', 'date_format:Y-m', 'after_or_equal:from', ReportingPeriod::maxRangeRule('from')],
        ]);

        return [$actor, $validated['from'], $validated['to']];
    }

    public function financing(Request $request, TransactionReports $reports): Response
    {
        [$actor, $from, $to] = $this->range($request);
        $mode = $request->validate(['mode' => ['nullable', Rule::in(['prospect', 'do'])]])['mode'] ?? 'prospect';

        return Inertia::render('analytics/financing', ['report' => $reports->financing($actor, $from, $to, $mode)]);
    }

    public function mappingArea(Request $request, TransactionReports $reports): Response
    {
        [$actor, $from, $to] = $this->range($request);

        return Inertia::render('analytics/mapping-area', ['report' => $reports->mappingArea($actor, $from, $to)]);
    }

    public function stageAchievement(Request $request, StageAchievements $achievements): Response
    {
        [$actor, $from, $to] = $this->range($request);

        return Inertia::render('analytics/stage-achievement', [
            'report' => [...$achievements->bySales($actor, new ReportingPeriod($from, $to)), 'from' => $from, 'to' => $to],
        ]);
    }

    public function targetHistory(Request $request, TargetHistory $history): Response
    {
        [$actor, $from, $to] = $this->range($request, 5);

        return Inertia::render('analytics/target-history', ['report' => $history->build($actor, $from, $to)]);
    }
}
