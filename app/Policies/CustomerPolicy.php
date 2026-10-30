<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\TeamMembership;
use App\Models\User;

class CustomerPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function viewAny(User $actor): bool
    {
        return $actor->dealer_id !== null;
    }

    public function view(User $actor, Customer $customer): bool
    {
        if ($actor->dealer_id === null || $actor->dealer_id !== $customer->dealer_id) {
            return false;
        }

        if (in_array($actor->role, [UserRole::Admin, UserRole::BranchManager], true)) {
            return true;
        }

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $assignedSalesId = $customer->activeAssignment?->sales_id;

            if ($assignedSalesId !== null) {
                $isSalesInMyTeam = TeamMembership::query()
                    ->whereIn('team_id', $teamIds)
                    ->where('user_id', $assignedSalesId)
                    ->whereNull('ended_at')
                    ->exists();

                if ($isSalesInMyTeam) {
                    return true;
                }
            }

            return $customer->created_by_id === $actor->id;
        }

        return $customer->activeAssignment?->sales_id === $actor->id;
    }

    public function create(User $actor): bool
    {
        return $actor->dealer_id !== null && in_array($actor->role, [UserRole::Admin, UserRole::Supervisor, UserRole::Sales], true);
    }

    public function update(User $actor, Customer $customer): bool
    {
        return $this->view($actor, $customer) && $actor->role !== UserRole::BranchManager;
    }

    public function assign(User $actor, Customer $customer): bool
    {
        if ($actor->dealer_id === null || $actor->dealer_id !== $customer->dealer_id) {
            return false;
        }

        return in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true);
    }
}
