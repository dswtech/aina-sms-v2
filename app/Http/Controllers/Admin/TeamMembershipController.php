<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeamMembershipRequest;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Support\AuditRecorder;
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

            $previousTeamPublicId = $current?->team()->value('public_id');
            $current?->update(['ended_at' => now()]);
            TeamMembership::query()->create([
                'team_id' => $team->id,
                'user_id' => $user->id,
                'role' => $user->role,
                'assigned_by_id' => $actor->id,
                'started_at' => now(),
            ]);
            AuditRecorder::record(
                $actor,
                $current === null ? 'membership.assigned' : 'membership.reassigned',
                $user,
                before: ['team_public_id' => $previousTeamPublicId],
                after: ['team_public_id' => $team->public_id],
                context: ['role' => $user->role->value],
            );
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

            $teamPublicId = $membership->team()->value('public_id');
            $membership->update(['ended_at' => now()]);
            AuditRecorder::record(
                $request->user(),
                'membership.ended',
                $lockedUser,
                before: ['team_public_id' => $teamPublicId],
                after: ['team_public_id' => null],
                context: ['role' => $lockedUser->role->value],
            );
        });

        return back()->with('status', 'Penempatan aktif ditutup.');
    }
}
