<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Invitation;
use App\Notifications\InvitationCreated;
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
            $invitation->update([
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => now()->addDays(7),
            ]);
            $this->audit($request, $invitation, 'invitation.resent');
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
            $invitation->update(['revoked_at' => now()]);
            $this->audit($request, $invitation, 'invitation.revoked');
        });

        return back()->with('status', 'Undangan dicabut.');
    }

    private function audit(Request $request, Invitation $invitation, string $action): void
    {
        AuditLog::query()->create([
            'dealer_id' => $invitation->dealer_id,
            'actor_id' => $request->user()->id,
            'action' => $action,
            'subject_type' => 'invitation',
            'subject_public_id' => $invitation->public_id,
            'metadata' => ['role' => $invitation->role->value],
        ]);
    }
}
