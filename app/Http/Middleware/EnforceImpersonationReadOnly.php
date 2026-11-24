<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/** "Login sebagai" is view-only (ADR 011): deny every write by default, plus data exports. */
class EnforceImpersonationReadOnly
{
    private const ALLOWED = ['impersonation.stop', 'logout'];

    private const BLOCKED_READS = ['transactions.export', 'analytics.csv'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession() || ! $request->session()->has('impersonator_id') || $request->routeIs(...self::ALLOWED)) {
            return $next($request);
        }

        if (! $request->isMethodSafe() || $request->routeIs(...self::BLOCKED_READS)) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => 'Mode lihat saja: perubahan tidak disimpan.']);

            return back();
        }

        return $next($request);
    }
}
