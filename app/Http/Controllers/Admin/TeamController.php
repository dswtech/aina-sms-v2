<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeamRequest;
use App\Http\Requests\Admin\UpdateTeamRequest;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Team::class);
        $actor = $request->user();

        $teams = Team::query()
            ->visibleTo($actor)
            ->withCount('activeMemberships')
            ->orderBy('name')
            ->get()
            ->map(fn (Team $team) => [
                'id' => $team->public_id,
                'name' => $team->name,
                'is_active' => $team->is_active,
                'member_count' => $team->active_memberships_count,
            ]);

        $people = User::query()
            ->visibleTo($actor)
            ->where('is_active', true)
            ->whereIn('role', [UserRole::Sales, UserRole::Supervisor])
            ->with(['activeTeamMemberships.team'])
            ->orderBy('name')
            ->get()
            ->map(function (User $user): array {
                $membership = $user->activeTeamMemberships->first();

                return [
                    'id' => $user->public_id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'role' => $user->role->value,
                    'team_id' => $membership?->team?->public_id,
                    'team_name' => $membership?->team?->name,
                ];
            });

        return Inertia::render('admin/teams/index', ['teams' => $teams, 'people' => $people]);
    }

    public function store(StoreTeamRequest $request): RedirectResponse
    {
        $actor = $request->user();
        $team = DB::transaction(function () use ($actor, $request): Team {
            $team = Team::query()->create([
                'public_id' => (string) Str::uuid(),
                'dealer_id' => $actor->dealer_id,
                'name' => $request->validated('name'),
                'is_active' => true,
            ]);
            AuditRecorder::record($actor, 'team.created', $team, after: [
                'name' => $team->name,
                'is_active' => $team->is_active,
            ]);

            return $team;
        });

        return back()->with('status', "{$team->name} berhasil dibuat.");
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        $validated = $request->validated();
        $wasActive = $team->is_active;
        $before = ['name' => $team->name, 'is_active' => $team->is_active];

        DB::transaction(function () use ($before, $request, $team, $validated, $wasActive): void {
            $team->update($validated);
            $action = array_key_exists('is_active', $validated) && $wasActive !== $team->is_active
                ? ($team->is_active ? 'team.reactivated' : 'team.deactivated')
                : 'team.updated';

            if (! $team->is_active && $wasActive) {
                $team->activeMemberships()->update(['ended_at' => now()]);
                Invitation::query()
                    ->where('team_id', $team->id)
                    ->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => now()]);
            }

            AuditRecorder::record(
                $request->user(),
                $action,
                $team,
                before: $before,
                after: ['name' => $team->name, 'is_active' => $team->is_active],
            );
        });

        return back()->with('status', 'Tim berhasil diperbarui.');
    }
}
