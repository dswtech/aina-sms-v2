<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Notifications\InvitationCreated;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvitationLifecycleController extends Controller
{
    public function resend(Request $request, Invitation $invitation): RedirectResponse
    {
        $this->authorize('update', $invitation);

        if (in_array($invitation->state(), ['used', 'revoked'], true)) {
            throw ValidationException::withMessages(['invitation' => 'Undangan terminal tidak dapat dikirim ulang.']);
        }

        $plainToken = Str::random(64);
        DB::transaction(function () use ($invitation, $plainToken, $request): void {
            $before = [
                'state' => $invitation->state(),
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ];
            $invitation->update([
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => now()->addDays(7),
            ]);
            AuditRecorder::record(
                $request->user(),
                'invitation.resent',
                $invitation,
                before: $before,
                after: [
                    'state' => $invitation->state(),
                    'expires_at' => $invitation->expires_at->toIso8601String(),
                ],
            );
        });

        Notification::route('mail', [$invitation->email => $invitation->name])
            ->notify(new InvitationCreated($invitation, $plainToken));

        return back()->with('status', 'Undangan dikirim ulang.');
    }

    public function revoke(Request $request, Invitation $invitation): RedirectResponse
    {
        $this->authorize('update', $invitation);

        if ($invitation->state() !== 'valid' && $invitation->state() !== 'expired') {
            throw ValidationException::withMessages(['invitation' => 'Undangan ini tidak dapat dicabut.']);
        }

        DB::transaction(function () use ($invitation, $request): void {
            $before = ['state' => $invitation->state()];
            $invitation->update(['revoked_at' => now()]);
            AuditRecorder::record(
                $request->user(),
                'invitation.revoked',
                $invitation,
                before: $before,
                after: ['state' => $invitation->state()],
            );
        });

        return back()->with('status', 'Undangan dicabut.');
    }
}
