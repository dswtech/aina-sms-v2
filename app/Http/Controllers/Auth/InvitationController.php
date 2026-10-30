<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptInvitationRequest;
use App\Http\Requests\Auth\StoreInvitationRequest;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\InvitationCreated;
use App\Support\AuditRecorder;
use App\Support\UsernameGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    public function store(StoreInvitationRequest $request): RedirectResponse
    {
        $actor = $request->user();
        $validated = $request->validated();
        $plainToken = Str::random(64);
        $username = $this->availableUsername(UsernameGenerator::fromName($validated['name']));

        $invitation = DB::transaction(function () use ($actor, $plainToken, $username, $validated): Invitation {
            $invitation = Invitation::query()->create([
                'public_id' => (string) Str::uuid(),
                'dealer_id' => $actor->dealer_id,
                'team_id' => $validated['team_id'] ?? null,
                'invited_by_id' => $actor->id,
                'name' => $validated['name'],
                'username' => $username,
                'email' => Str::lower($validated['email']),
                'role' => $validated['role'],
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => now()->addDays(7),
            ]);

            AuditRecorder::record(
                $actor,
                'invitation.created',
                $invitation,
                after: [
                    'state' => $invitation->state(),
                    'role' => $invitation->role->value,
                    'team_public_id' => $invitation->team?->public_id,
                ],
            );

            return $invitation;
        });

        Notification::route('mail', [$invitation->email => $invitation->name])
            ->notify(new InvitationCreated($invitation, $plainToken));

        return back()->with('status', 'Undangan berhasil dikirim.');
    }

    public function show(Request $request, string $token): Response
    {
        $invitation = $this->findByToken($token);
        $state = $invitation?->state() ?? 'invalid';

        $props = [
            'state' => $state,
            'token' => $state === 'valid' ? $token : null,
        ];

        if ($state === 'valid') {
            $props['invitation'] = [
                'name' => $invitation->name,
                'email' => $invitation->email,
                'username' => $invitation->username,
                'role' => $invitation->role->value,
                'team' => $invitation->team?->name,
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ];
        }

        return Inertia::render('auth/activate-invitation', $props);
    }

    public function accept(AcceptInvitationRequest $request, string $token): RedirectResponse
    {
        DB::transaction(function () use ($request, $token): void {
            $invitation = Invitation::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if ($invitation === null || $invitation->state() !== 'valid') {
                throw ValidationException::withMessages(['invitation' => 'Undangan tidak valid atau sudah tidak dapat digunakan.']);
            }

            if (User::query()->where('email', $invitation->email)->orWhere('username', $invitation->username)->exists()) {
                throw ValidationException::withMessages(['invitation' => 'Akun untuk undangan ini sudah ada. Hubungi Admin dealer.']);
            }

            $requiresTeam = in_array($invitation->role, [UserRole::Sales, UserRole::Supervisor], true);

            if ($requiresTeam && ($invitation->team_id === null || ! Team::query()
                ->whereKey($invitation->team_id)
                ->where('dealer_id', $invitation->dealer_id)
                ->where('is_active', true)
                ->exists())) {
                throw ValidationException::withMessages(['invitation' => 'Penempatan tim pada undangan tidak lagi aktif. Hubungi Admin dealer.']);
            }

            $user = User::query()->create([
                'dealer_id' => $invitation->dealer_id,
                'public_id' => (string) Str::uuid(),
                'name' => $invitation->name,
                'username' => $invitation->username,
                'email' => $invitation->email,
                'email_verified_at' => now(),
                'password' => $request->validated('password'),
                'role' => $invitation->role,
                'is_active' => true,
            ]);

            if ($requiresTeam) {
                TeamMembership::query()->create([
                    'team_id' => $invitation->team_id,
                    'user_id' => $user->id,
                    'role' => $invitation->role,
                    'assigned_by_id' => $invitation->invited_by_id,
                    'started_at' => now(),
                ]);
            }

            $invitation->update(['accepted_at' => now()]);
            AuditRecorder::record(
                $user,
                'invitation.accepted',
                $invitation,
                before: ['state' => 'valid'],
                after: ['state' => $invitation->state()],
            );
        });

        return redirect()->route('login')->with('status', 'Akun aktif. Silakan masuk dengan username Anda.');
    }

    private function findByToken(string $token): ?Invitation
    {
        return Invitation::query()
            ->with('team')
            ->where('token_hash', hash('sha256', $token))
            ->first();
    }

    private function availableUsername(string $base): string
    {
        $candidate = $base;
        $suffix = 1;

        while (User::query()->where('username', $candidate)->exists()
            || Invitation::query()->where('username', $candidate)->whereNull('accepted_at')->whereNull('revoked_at')->exists()) {
            $suffix++;
            $candidate = Str::limit($base, 12 - strlen((string) $suffix), '').$suffix;
        }

        return $candidate;
    }
}
