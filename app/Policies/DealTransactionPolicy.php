<?php

namespace App\Policies;

use App\Models\DealTransaction;
use App\Models\User;

class DealTransactionPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function view(User $actor, DealTransaction $deal): bool
    {
        return DealTransaction::query()
            ->visibleTo($actor)
            ->whereKey($deal->getKey())
            ->exists();
    }

    public function update(User $actor, DealTransaction $deal): bool
    {
        return ! $deal->current_stage->isClosed() && $this->view($actor, $deal);
    }
}
