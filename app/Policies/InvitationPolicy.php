<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Invitation;
use App\Models\User;

class InvitationPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function viewAny(User $actor): bool
    {
        return $actor->role === UserRole::Admin && $actor->dealer_id !== null;
    }

    public function view(User $actor, Invitation $invitation): bool
    {
        return $actor->role === UserRole::Admin
            && $actor->dealer_id !== null
            && $actor->dealer_id === $invitation->dealer_id;
    }

    public function create(User $actor): bool
    {
        return $this->viewAny($actor);
    }

    public function update(User $actor, Invitation $invitation): bool
    {
        return $this->view($actor, $invitation);
    }

    public function delete(User $actor, Invitation $invitation): bool
    {
        return false;
    }
}
