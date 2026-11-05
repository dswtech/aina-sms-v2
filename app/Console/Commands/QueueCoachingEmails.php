<?php

namespace App\Console\Commands;

use App\Actions\QueueCoachingEmail;
use App\Notifications\DealCommentCreated;
use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;

class QueueCoachingEmails extends Command
{
    protected $signature = 'coaching:queue-emails';

    protected $description = 'Queue pending coaching email delivery intents';

    public function handle(QueueCoachingEmail $queueEmail): int
    {
        DatabaseNotification::query()->where('type', DealCommentCreated::class)
            ->whereJsonContains('data', ['email_status' => 'pending'])->eachById(function (DatabaseNotification $record) use ($queueEmail): void {
                $queueEmail($record->id);
            });

        return self::SUCCESS;
    }
}
