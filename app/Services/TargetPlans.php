<?php

namespace App\Services;

use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Support\TargetUnits;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class TargetPlans
{
    /**
     * @param  Collection<int, Team>  $teams
     * @param  Collection<int, TeamMembership>  $memberships
     * @param  Collection<int, TeamTarget>  $targets
     * @param  Collection<int, SalesTarget>  $legacy
     * @return list<array<string, mixed>>
     */
    public function editor(Collection $teams, Collection $memberships, Collection $targets, Collection $legacy, string $period): array
    {
        return array_values($teams->where('is_active', true)->map(function (Team $team) use ($memberships, $targets, $legacy, $period): array {
            $target = $targets->firstWhere('team_id', $team->id);
            $current = $memberships->where('team_id', $team->id)->unique('user_id')->keyBy('user_id');
            $saved = $target?->allocations->keyBy('user_id') ?? collect();
            $ids = $current->keys()->merge($saved->keys())->unique();
            $members = $ids->map(function ($id) use ($current, $saved, $legacy, $target, $period): array {
                $membership = $current->firstWhere('user_id', $id);
                $allocation = $saved->firstWhere('user_id', $id);
                $user = $membership->user ?? $allocation->user;
                $legacyTarget = $target?->version > 0 ? null : $legacy->get($id)?->target_units;
                $days = $this->weekdays($period, $membership === null ? null : CarbonImmutable::parse($membership->started_at)->toDateString());

                return ['user_id' => $id, 'name' => $user->name, 'username' => $user->username,
                    'active' => $membership !== null, 'target_units' => $allocation !== null ? TargetUnits::number(TargetUnits::scaled($allocation->target_units)) : $legacyTarget,
                    'allocated' => $allocation !== null || $legacyTarget !== null,
                    'remaining_workdays' => $days[0], 'period_workdays' => $days[1]];
            })->sortBy('name')->values()->all();

            return ['team_id' => $team->public_id, 'name' => $team->name, 'period' => $period,
                'target_units' => $target?->target_units, 'markup_percent' => $target === null ? 0 : (float) $target->markup_percent,
                'benchmark_units' => $target?->benchmark_units === null ? null : (float) $target->benchmark_units,
                'version' => $target->version ?? 0, 'legacy' => $target !== null && $target->version === 0, 'members' => $members];
        })->values()->all());
    }

    /** @return array{int, int} */
    private function weekdays(string $period, ?string $joined): array
    {
        $start = CarbonImmutable::parse($period.'-01', 'Asia/Jakarta');
        $today = CarbonImmutable::today('Asia/Jakarta')->toDateString();
        $from = max($today, $joined ?? $start->toDateString());
        $total = 0;
        $remaining = 0;
        for ($date = $start; $date->format('Y-m') === $period; $date = $date->addDay()) {
            if ($date->isWeekday()) {
                $total++;
                $remaining += $date->toDateString() >= $from ? 1 : 0;
            }
        }

        return [$remaining, $total];
    }
}
