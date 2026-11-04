<?php

namespace App\Jobs;

use App\Models\DealComment;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendCoachingEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120];

    public function __construct(public readonly string $notificationId) {}

    public function handle(): void
    {
        DB::transaction(function (): void {
            $record = DatabaseNotification::query()->where('type', DealCommentCreated::class)
                ->whereKey($this->notificationId)->lockForUpdate()->first();
            if ($record === null || ! in_array($record->data['email_status'] ?? null, ['pending', 'queued', 'failed'], true)) {
                return;
            }

            // Never hydrate or serialize the coaching body into the email job.
            $commentId = $record->data['comment_id'] ?? null;
            $comment = is_int($commentId)
                ? DealComment::query()->select(['id', 'deal_transaction_id', 'user_id', 'stage_at_creation'])->find($commentId)
                : null;
            $recipient = $record->notifiable;
            $deal = $comment?->deal;
            if ($comment?->stage_at_creation === null || $deal === null || ! $recipient instanceof User) {
                $record->update(['data' => [...$record->data, 'email_status' => 'cancelled']]);

                return;
            }

            $notification = new DealCommentCreated($deal->id, $deal->public_id, $comment->id, $comment->user_id, $comment->stage_at_creation->value);
            if (! $notification->shouldSend($recipient, 'mail')) {
                $record->update(['data' => [...$record->data, 'email_status' => 'cancelled']]);

                return;
            }

            $recipient->notifyNow($notification, ['mail']);
            $record->update(['data' => [...$record->data, 'email_status' => 'sent']]);
        });
    }

    public function failed(?Throwable $exception): void
    {
        $record = DatabaseNotification::query()->where('type', DealCommentCreated::class)->find($this->notificationId);
        if ($record !== null && ($record->data['email_status'] ?? null) === 'queued') {
            $record->update(['data' => [...$record->data, 'email_status' => 'failed']]);
        }
        Log::warning('Coaching email failed after retries.', ['notification_id' => $this->notificationId]);
    }
}
