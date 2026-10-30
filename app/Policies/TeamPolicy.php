<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function viewAny(User $actor): bool
    {
        return $actor->dealer_id !== null && $actor->role !== UserRole::BranchManager;
    }

    public function view(User $actor, Team $team): bool
    {
        if (! $this->sameDealer($actor, $team)) {
            return false;
        }

        if ($actor->role === UserRole::Admin) {
            return true;
        }

        if ($actor->role === UserRole::BranchManager) {
            return false;
        }

        return $team->is_active && $actor->activeTeamMemberships()
            ->where('team_id', $team->id)
            ->exists();
    }

    public function create(User $actor): bool
    {
        return $actor->role === UserRole::Admin && $actor->dealer_id !== null;
    }

    public function update(User $actor, Team $team): bool
    {
        return $actor->role === UserRole::Admin && $this->sameDealer($actor, $team);
    }

    public function delete(User $actor, Team $team): bool
    {
        return false;
    }

    private function sameDealer(User $actor, Team $team): bool
    {
        return $actor->dealer_id !== null && $actor->dealer_id === $team->dealer_id;
    }
}
