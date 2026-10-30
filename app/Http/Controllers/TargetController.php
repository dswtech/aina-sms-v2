<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\SalesTarget;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TargetController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'target_units' => ['required', 'integer', 'min:0'],
            'target_value' => ['nullable', 'integer', 'min:0'],
        ]);

        /** @var User $actor */
        $actor = $request->user();
        $targetUser = User::query()->findOrFail($validated['user_id']);

        // Authorization: sales can only set own; supervisor own team; admin any
        if ($actor->role === UserRole::Sales && $targetUser->id !== $actor->id) {
            abort(403);
        }
        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $inTeam = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('user_id', $targetUser->id)
                ->whereNull('ended_at')
                ->exists();
            if (! $inTeam && $targetUser->id !== $actor->id) {
                abort(403);
            }
        }

        $period = Carbon::now()->startOfMonth()->toDateString();

        SalesTarget::query()->updateOrCreate(
            ['user_id' => $targetUser->id, 'period' => $period],
            [
                'target_units' => $validated['target_units'],
                'target_value' => $validated['target_value'] ?? 0,
                'created_by_id' => $actor->id,
            ]
        );

        return back();
    }
}
