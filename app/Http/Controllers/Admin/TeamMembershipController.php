<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeamMembershipRequest;
use App\Models\AuditLog;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamMembershipController extends Controller
{
    public function store(StoreTeamMembershipRequest $request): RedirectResponse
    {
        $actor = $request->user();
        DB::transaction(function () use ($actor, $request): void {
            $user = User::query()
                ->where('public_id', $request->validated('user_id'))
                ->where('dealer_id', $actor->dealer_id)
                ->where('is_active', true)
                ->lockForUpdate()
                ->sole();
            $team = Team::query()
                ->where('public_id', $request->validated('team_id'))
                ->where('dealer_id', $actor->dealer_id)
                ->where('is_active', true)
                ->lockForUpdate()
                ->sole();
            $current = $user->activeTeamMemberships()->lockForUpdate()->first();

            if ($current?->team_id === $team->id) {
                return;
            }

            $current?->update(['ended_at' => now()]);
            TeamMembership::query()->create([
                'team_id' => $team->id,
                'user_id' => $user->id,
                'role' => $user->role,
                'assigned_by_id' => $actor->id,
                'started_at' => now(),
            ]);
            $this->audit($actor, $user, $current === null ? 'membership.assigned' : 'membership.reassigned', [
                'team_public_id' => $team->public_id,
            ]);
        });

        return back()->with('status', 'Penempatan berhasil diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        DB::transaction(function () use ($request, $user): void {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->sole();
            $membership = $lockedUser->activeTeamMemberships()->lockForUpdate()->first();

            if ($membership === null) {
                return;
            }

            $membership->update(['ended_at' => now()]);
            $this->audit($request->user(), $lockedUser, 'membership.ended', [
                'team_id' => $membership->team_id,
            ]);
        });

        return back()->with('status', 'Penempatan aktif ditutup.');
    }

    /** @param array<string, mixed> $metadata */
    private function audit(User $actor, User $subject, string $action, array $metadata): void
    {
        AuditLog::query()->create([
            'dealer_id' => $subject->dealer_id,
            'actor_id' => $actor->id,
            'action' => $action,
            'subject_type' => 'user',
            'subject_public_id' => $subject->public_id,
            'metadata' => $metadata,
        ]);
    }
}
