<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class UserPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function viewAny(User $actor): bool
    {
        return in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true);
    }

    public function view(User $actor, User $user): bool
    {
        if ($actor->is($user)) {
            return true;
        }

        if (! $this->sameDealer($actor, $user)) {
            return false;
        }

        if ($actor->role === UserRole::Admin) {
            return true;
        }

        if ($actor->role !== UserRole::Supervisor) {
            return false;
        }

        return $user->activeTeamMemberships()
            ->whereIn('team_id', $actor->activeTeamMemberships()
                ->where('role', UserRole::Supervisor)
                ->select('team_id'))
            ->exists();
    }

    public function create(User $actor): bool
    {
        return $actor->role === UserRole::Admin && $actor->dealer_id !== null;
    }

    public function update(User $actor, User $user): bool
    {
        return $actor->role === UserRole::Admin && $this->sameDealer($actor, $user);
    }

    public function delete(User $actor, User $user): bool
    {
        return false;
    }

    private function sameDealer(User $actor, User $user): bool
    {
        return $actor->dealer_id !== null && $actor->dealer_id === $user->dealer_id;
    }
}
