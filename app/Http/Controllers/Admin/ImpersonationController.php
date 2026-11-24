<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Read-only "login sebagai" (ADR 011); writes are blocked by EnforceImpersonationReadOnly. */
class ImpersonationController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        $this->authorize('impersonate', $user);
        abort_if($request->session()->has('impersonator_id'), 403);

        $admin = $request->user();
        AuditRecorder::record($admin, 'impersonation.started', $user, context: ['role' => $user->role->value]);

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('impersonator_id', $admin->id);

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        if (! $request->session()->has('impersonator_id')) {
            return redirect()->route('dashboard');
        }

        $admin = User::query()->whereKey($request->session()->get('impersonator_id'))->first();

        if ($admin === null || ! $admin->is_active || $admin->role !== UserRole::Admin) {
            self::signOut($request, 'admin_access_lost');

            return redirect()->route('login');
        }

        $request->session()->forget('impersonator_id');
        AuditRecorder::record($admin, 'impersonation.stopped', $request->user(), context: ['role' => $request->user()->role->value]);

        Auth::login($admin);
        $request->session()->regenerate();

        return redirect()->route('users.index');
    }

    /** Ends the whole session without Auth::logout(), which would cycle the viewed user's remember token. */
    public static function signOut(Request $request, string $reason): void
    {
        $admin = User::query()->whereKey($request->session()->get('impersonator_id'))->first();
        $viewed = $request->user();

        if ($admin !== null && $viewed !== null) {
            AuditRecorder::record($admin, 'impersonation.stopped', $viewed, context: ['role' => $viewed->role->value, 'reason' => $reason]);
        }

        Auth::guard('web')->logoutCurrentDevice();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
