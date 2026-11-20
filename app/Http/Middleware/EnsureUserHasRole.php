<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // UserRole::from throws on a mistyped route role instead of silently forbidding everyone.
        $allowed = array_map(UserRole::from(...), $roles);

        abort_unless(
            $request->user() && in_array($request->user()->role, $allowed, true),
            403,
        );

        return $next($request);
    }
}
