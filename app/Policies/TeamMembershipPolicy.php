<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\TeamMembership;
use App\Models\User;

class TeamMembershipPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function viewAny(User $actor): bool
    {
        return $actor->dealer_id !== null && $actor->role !== UserRole::BranchManager;
    }

    public function view(User $actor, TeamMembership $membership): bool
    {
        if ($actor->dealer_id === null || $actor->dealer_id !== $membership->team()->value('dealer_id')) {
            return false;
        }

        if ($actor->role === UserRole::Admin) {
            return true;
        }

        if ($actor->role === UserRole::Sales) {
            return $membership->user_id === $actor->id;
        }

        if ($actor->role === UserRole::BranchManager) {
            return false;
        }

        return $actor->activeTeamMemberships()
            ->where('role', UserRole::Supervisor)
            ->where('team_id', $membership->team_id)
            ->exists();
    }

    public function create(User $actor): bool
    {
        return $actor->role === UserRole::Admin && $actor->dealer_id !== null;
    }

    public function update(User $actor, TeamMembership $membership): bool
    {
        return $actor->role === UserRole::Admin
            && $actor->dealer_id !== null
            && $actor->dealer_id === $membership->team()->value('dealer_id');
    }

    public function delete(User $actor, TeamMembership $membership): bool
    {
        return false;
    }
}
