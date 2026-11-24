<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;

/** Teams whose target for the current month is missing or not fully divided; same rules as the dashboard counts. */
class TargetReminder
{
    /** @return array{today: string, period: string, teams: list<array{id: string, name: string, reason: string, unallocated_count: int}>}|null */
    public function forUser(?User $user): ?array
    {
        if ($user?->role !== UserRole::Supervisor) {
            return null;
        }
        $today = now('Asia/Jakarta');
        $period = $today->format('Y-m').'-01';
        $teams = Team::query()->visibleTo($user)
            ->whereIn('id', $user->activeTeamMemberships()->where('role', UserRole::Supervisor)->select('team_id'))->orderBy('name')->get();
        $targets = TeamTarget::query()->with('allocations')->whereIn('team_id', $teams->modelKeys())->whereDate('period', $period)->get()->keyBy('team_id');
        $members = TeamMembership::query()->whereIn('team_id', $targets->keys())->whereNull('ended_at')->where('role', UserRole::Sales)
            ->whereHas('user', fn ($q) => $q->where('dealer_id', $user->dealer_id)->where('is_active', true)->where('role', UserRole::Sales))
            ->get(['team_id', 'user_id']);
        $legacyIds = SalesTarget::query()->whereIn('user_id', $members->pluck('user_id'))->whereDate('period', $period)->pluck('user_id');

        $incomplete = [];
        foreach ($teams as $team) {
            $target = $targets->get($team->id);
            $unallocated = $target === null ? 0 : $members->where('team_id', $team->id)->pluck('user_id')->unique()
                ->diff($target->version > 0 ? $target->allocations->pluck('user_id') : $legacyIds)->count();
            if ($target === null || $unallocated > 0) {
                $incomplete[] = ['id' => $team->public_id, 'name' => $team->name,
                    'reason' => $target === null ? 'missing_target' : 'unallocated_sales', 'unallocated_count' => $unallocated];
            }
        }

        return $incomplete === [] ? null : ['today' => $today->format('Y-m-d'), 'period' => $today->format('Y-m'), 'teams' => $incomplete];
    }
}
