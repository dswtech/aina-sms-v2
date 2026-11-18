<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\DealTransaction;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Support\Collection;

class DealAudience
{
    /** @return Collection<int, User> Active supervisors of the team the deal's sales currently belongs to. */
    public function supervisorsOf(DealTransaction $deal): Collection
    {
        $teamIds = TeamMembership::query()->where('user_id', $deal->sales_id)
            ->where('role', UserRole::Sales)->whereNull('ended_at')->select('team_id');

        return User::query()->where('dealer_id', $deal->dealer_id)->where('is_active', true)
            ->where('role', UserRole::Supervisor)
            ->whereHas('activeTeamMemberships', fn ($memberships) => $memberships
                ->where('role', UserRole::Supervisor)->whereIn('team_id', $teamIds))
            ->get();
    }
}
