<?php

namespace App\Actions;

use App\Jobs\SendCoachingEmail;
use App\Notifications\DealCommentCreated;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class QueueCoachingEmail
{
    public function __invoke(string $notificationId): void
    {
        try {
            DB::transaction(function () use ($notificationId): void {
                $record = DatabaseNotification::query()->where('type', DealCommentCreated::class)
                    ->whereKey($notificationId)->lockForUpdate()->first();
                if ($record === null || ($record->data['email_status'] ?? null) !== 'pending') {
                    return;
                }

                // Queue insertion and state transition share a transaction. A failed
                // insertion leaves the committed intent pending for the scheduler.
                SendCoachingEmail::dispatch($record->id)->beforeCommit();
                $record->refresh();
                if (($record->data['email_status'] ?? null) === 'pending') {
                    $record->update(['data' => [...$record->data, 'email_status' => 'queued']]);
                }
            });
        } catch (Throwable) {
            Log::warning('Unable to queue coaching email; delivery remains pending.', ['notification_id' => $notificationId]);
        }
    }
}
