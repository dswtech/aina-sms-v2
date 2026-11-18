<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Requests\Settings\UsernameChangeRequest;
use App\Models\User;
use App\Services\UsernameReservations;
use App\Support\AuditRecorder;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'usernameLocked' => $request->user()->username_changed_at !== null,
        ]);
    }

    /**
     * Let the user pick their own username once; the old name stays held so nobody else can take it (ADR-009).
     */
    public function updateUsername(UsernameChangeRequest $request, UsernameReservations $reservations): RedirectResponse
    {
        $error = ValidationException::withMessages(['username' => __('Username ini sudah dipakai.')]);

        try {
            DB::transaction(function () use ($request, $reservations): void {
                $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);

                if ($user->username_changed_at !== null) {
                    throw ValidationException::withMessages(['username' => __('Username sudah pernah diganti dan tidak bisa diubah lagi.')]);
                }

                $old = $user->username;
                if ($old !== null) {
                    $reservations->hold($old);
                }

                $user->forceFill(['username' => $request->validated('username'), 'username_changed_at' => now()])->save();

                AuditRecorder::record($user, 'user.username_changed', $user, ['username' => $old], ['username' => $user->username]);
            });
        } catch (UniqueConstraintViolationException) {
            // Another account took the name between validation and save; the unique index decided.
            throw $error;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Username diganti.')]);

        return to_route('profile.edit');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }
}
