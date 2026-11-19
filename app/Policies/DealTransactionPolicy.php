<?php

namespace App\Policies;

use App\Enums\PipelineStage;
use App\Enums\UserRole;
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

    public function recordDo(User $actor, DealTransaction $deal): bool
    {
        return in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)
            && $this->update($actor, $deal);
    }

    public function confirmDelivery(User $actor, DealTransaction $deal): bool
    {
        return $deal->current_stage === PipelineStage::Do
            && in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)
            && $this->view($actor, $deal);
    }

    public function cancelDo(User $actor, DealTransaction $deal): bool
    {
        // A DO is only reversible in its own Jakarta month, so closed months keep their realization.
        return $deal->current_stage === PipelineStage::Do
            && $actor->role === UserRole::Admin
            && $this->view($actor, $deal)
            && $deal->currentDoEvent()?->created_at->setTimezone('Asia/Jakarta')->format('Y-m') === now('Asia/Jakarta')->format('Y-m');
    }
}
