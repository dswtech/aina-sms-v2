<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\User;

class DealCommentPolicy
{
    public function before(User $actor): ?bool
    {
        return $actor->is_active ? null : false;
    }

    public function view(User $actor, DealComment $comment): bool
    {
        // The deal is null once its transaction is deleted.
        return $comment->deal !== null && app(DealTransactionPolicy::class)->view($actor, $comment->deal);
    }

    /** Writing ends with the deal: DO and Lost lock the conversation. */
    public function create(User $actor, DealTransaction $deal): bool
    {
        return ! $deal->current_stage->isClosed() && $this->participate($actor, $deal);
    }

    /** A side of the conversation: may read it and be notified, also after the deal ended. */
    public function participate(User $actor, DealTransaction $deal): bool
    {
        return in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)
            && app(DealTransactionPolicy::class)->view($actor, $deal);
    }

    public function update(User $actor, DealComment $comment): bool
    {
        return $comment->deal !== null && $comment->canEdit($actor)
            && $this->create($actor, $comment->deal);
    }

    public function delete(User $actor, DealComment $comment): bool
    {
        return false;
    }
}
