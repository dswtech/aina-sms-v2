<?php

namespace App\Policies;

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
        return app(DealTransactionPolicy::class)->view($actor, $comment->deal);
    }

    public function create(User $actor, DealTransaction $deal): bool
    {
        return app(DealTransactionPolicy::class)->view($actor, $deal);
    }

    public function update(User $actor, DealComment $comment): bool
    {
        return $comment->canEdit($actor)
            && app(DealTransactionPolicy::class)->view($actor, $comment->deal);
    }

    public function delete(User $actor, DealComment $comment): bool
    {
        return false;
    }
}
