<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\DealComment;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;

class VisibleCoachingNotifications
{
    /** @return Collection<int, DatabaseNotification> */
    public function forUser(User $actor): Collection
    {
        if (! in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)) {
            return collect();
        }
        $notifications = $actor->unreadNotifications()->where('type', DealCommentCreated::class)->latest()->get();
        $commentIds = $notifications->map(fn (DatabaseNotification $n): mixed => $n->data['comment_id'] ?? null)->filter()->all();
        $visibleIds = DealComment::query()->whereIn('id', $commentIds)
            ->whereHas('deal', fn ($q) => $q->visibleTo($actor))->pluck('id')->all();

        return $notifications->filter(fn (DatabaseNotification $n): bool => in_array($n->data['comment_id'] ?? null, $visibleIds, true))->values();
    }
}
