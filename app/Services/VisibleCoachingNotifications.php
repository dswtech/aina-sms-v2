<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\User;
use App\Notifications\DealBecameStagnant;
use App\Notifications\DealCommentCreated;
use App\Notifications\DealStageChanged;
use App\Notifications\ReleaseAnnounced;
use App\Notifications\StagnantDealsSummary;
use Carbon\CarbonImmutable;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;

/**
 * Notifications the actor may see. Access is re-checked on every read, so a notification
 * disappears once the actor loses access to the deal it points at. Release announcements
 * go to every role; coaching notifications only to Sales and Supervisor.
 */
class VisibleCoachingNotifications
{
    private const TYPES = [DealCommentCreated::class, DealStageChanged::class, DealBecameStagnant::class, StagnantDealsSummary::class, ReleaseAnnounced::class];

    private const SHARED_KEYS = ['title', 'message', 'url', 'comment_id', 'email_status', 'kind', 'count'];

    /** @return Collection<int, DatabaseNotification> Unread notifications inside the history window, newest first. */
    public function forUser(User $actor): Collection
    {
        return $this->visible($actor, $actor->unreadNotifications()->whereIn('type', $this->typesFor($actor))
            ->where('created_at', '>=', $this->windowStart())->latest()->get());
    }

    /** @return Collection<int, DatabaseNotification> Read and unread notifications of the last three Jakarta days, newest first. */
    public function historyFor(User $actor): Collection
    {
        return $this->visible($actor, $actor->notifications()->whereIn('type', $this->typesFor($actor))
            ->where('created_at', '>=', $this->windowStart())->latest()->get());
    }

    /** @return array{id: string, data: array<string, mixed>, created_at: string|null, read_at: string|null} */
    public function present(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'data' => array_intersect_key($notification->data, array_flip(self::SHARED_KEYS)),
            'created_at' => $notification->created_at?->toISOString(),
            'read_at' => $notification->read_at?->toISOString(),
        ];
    }

    /** Start of the Jakarta day three days ago, in UTC because created_at is stored in UTC. */
    private function windowStart(): CarbonImmutable
    {
        return CarbonImmutable::now('Asia/Jakarta')->startOfDay()->subDays(3)->utc();
    }

    /** @return list<class-string> */
    private function typesFor(User $actor): array
    {
        return in_array($actor->role, [UserRole::Sales, UserRole::Supervisor], true)
            ? self::TYPES
            : [ReleaseAnnounced::class];
    }

    /**
     * @param  Collection<int, DatabaseNotification>  $notifications
     * @return Collection<int, DatabaseNotification>
     */
    private function visible(User $actor, Collection $notifications): Collection
    {
        $commentIds = $notifications->where('type', DealCommentCreated::class)->map(fn (DatabaseNotification $n): mixed => $n->data['comment_id'] ?? null)->filter()->all();
        $visibleComments = DealComment::query()->whereIn('id', $commentIds)
            ->whereHas('deal', fn ($q) => $q->visibleTo($actor))->pluck('id')->all();
        $dealIds = $notifications->whereIn('type', [DealStageChanged::class, DealBecameStagnant::class])->map(fn (DatabaseNotification $n): mixed => $n->data['deal_id'] ?? null)->filter()->all();
        $visibleDeals = DealTransaction::query()->whereIn('id', $dealIds)->visibleTo($actor)->pluck('id')->all();

        return $notifications->filter(fn (DatabaseNotification $n): bool => match ($n->type) {
            DealCommentCreated::class => in_array($n->data['comment_id'] ?? null, $visibleComments, true),
            DealStageChanged::class, DealBecameStagnant::class => in_array($n->data['deal_id'] ?? null, $visibleDeals, true),
            default => true,
        })->values();
    }
}
