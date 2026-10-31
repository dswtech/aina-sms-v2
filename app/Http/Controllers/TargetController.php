<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\SalesTarget;
use App\Models\TeamMembership;
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

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $isTeamMember = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('user_id', $sales->id)
                ->whereNull('ended_at')
                ->exists();
            abort_unless($isTeamMember, 403);
        }

        DB::transaction(function () use ($actor, $sales, $validated): void {
            $period = $validated['period'].'-01';
            $target = SalesTarget::query()->firstOrNew([
                'user_id' => $sales->id,
                'period' => $period,
            ]);

            $oldUnits = $target->exists ? $target->target_units : null;
            $oldValue = $target->exists ? $target->target_value : null;
            $newValue = (int) ($validated['target_value'] ?? 0);

            $target->fill([
                'target_units' => $validated['target_units'],
                'target_value' => $newValue,
                'created_by_id' => $actor->id,
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
}
