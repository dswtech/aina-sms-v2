<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TargetController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless(in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true), 403);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'period' => ['required', 'date_format:Y-m'],
            'target_units' => ['required', 'integer', 'min:0', 'max:10000'],
            'target_value' => ['nullable', 'integer', 'min:0'],
        ]);

        $sales = User::query()
            ->whereKey($validated['user_id'])
            ->where('dealer_id', $actor->dealer_id)
            ->where('role', UserRole::Sales)
            ->firstOrFail();

        abort_unless($sales->is_active, 403);

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $isTeamMember = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('role', UserRole::Sales->value)
                ->where('user_id', $sales->id)
                ->whereNull('ended_at')
                ->exists();
            abort_unless($isTeamMember, 403);
        }

        DB::transaction(function () use ($actor, $sales, $validated): void {
            User::query()->whereKey($sales->id)->lockForUpdate()->firstOrFail();
            $period = $validated['period'].'-01';
            $target = SalesTarget::query()->where('user_id', $sales->id)->whereDate('period', $period)->first()
                ?? new SalesTarget(['user_id' => $sales->id, 'period' => $period]);

            $oldUnits = $target->exists ? $target->target_units : null;
            $oldValue = $target->exists ? $target->target_value : null;
            $newValue = (int) ($validated['target_value'] ?? 0);

            if (! $target->exists) {
                $target->fill(['created_by_id' => $actor->id]);
            }
            $target->fill([
                'target_units' => $validated['target_units'],
                'target_value' => $newValue,
            ])->save();

            $target->revisions()->create([
                'changed_by_id' => $actor->id,
                'old_target_units' => $oldUnits,
                'old_target_value' => $oldValue,
                'new_target_units' => $validated['target_units'],
                'new_target_value' => $newValue,
            ]);
        });

        return back();
    }

    public function storeTeam(Request $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless(in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true), 403);
        $validated = $request->validate([
            'team_id' => ['required', 'uuid'],
            'period' => ['required', 'date_format:Y-m'],
            'target_units' => ['required', 'integer', 'min:0', 'max:10000'],
            'target_value' => ['nullable', 'integer', 'min:0'],
        ]);
        $team = Team::query()->visibleTo($actor)->active()->where('public_id', $validated['team_id'])->first();
        abort_unless($team !== null, 403);
        if ($actor->role === UserRole::Supervisor) {
            abort_unless($actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->where('team_id', $team->id)->exists(), 403);
        }
        DB::transaction(function () use ($actor, $team, $validated): void {
            // Lock the stable parent too: a target may not exist yet.
            Team::query()->whereKey($team->id)->lockForUpdate()->firstOrFail();
            $target = TeamTarget::query()->where('team_id', $team->id)->whereDate('period', $validated['period'].'-01')->first()
                ?? new TeamTarget(['team_id' => $team->id, 'period' => $validated['period'].'-01']);
            $oldUnits = $target->exists ? $target->target_units : null;
            $oldValue = $target->exists ? $target->target_value : null;
            if (! $target->exists) {
                $target->fill(['created_by_id' => $actor->id]);
            }
            $target->fill(['target_units' => $validated['target_units'], 'target_value' => $validated['target_value'] ?? 0])->save();
            $target->revisions()->create([
                'changed_by_id' => $actor->id, 'old_target_units' => $oldUnits, 'old_target_value' => $oldValue,
                'new_target_units' => $target->target_units, 'new_target_value' => $target->target_value,
            ]);
        });

        return back();
    }
}
