<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TransactionReports;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Financing and Mapping Area reports. Roles are gated on the route group (Supervisor, BM, Admin). */
class ReportController extends Controller
{
    /** @return array{0: User, 1: string, 2: string} */
    private function range(Request $request): array
    {
        /** @var User $actor */
        $actor = $request->user();
        $month = now('Asia/Jakarta')->format('Y-m');
        $request->merge(['from' => $request->input('from', $month), 'to' => $request->input('to', $request->input('from', $month))]);
        $validated = $request->validate([
            'from' => ['required', 'date_format:Y-m'],
            'to' => ['required', 'date_format:Y-m', 'after_or_equal:from'],
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
}
