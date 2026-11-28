<?php

namespace App\Console\Commands;

use App\Notifications\DealCommentCreated;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Storage;

/** Retention: uploaded import CSVs 30 days (IMP-04), notifications 90 days (CVS-17). */
class PruneOldData extends Command
{
    protected $signature = 'data:prune';

    protected $description = 'Delete uploaded import CSVs after 30 days and notifications after 90 days';

    public function handle(): int
    {
        $disk = Storage::disk('local');
        $fileCutoff = now()->subDays(30)->getTimestamp();
        $files = collect($disk->files('imports'))->filter(fn (string $path): bool => $disk->lastModified($path) < $fileCutoff);
        $disk->delete($files->all());

        // Coaching email still waiting for the queue keeps its intent row until it is sent or fails.
        $notifications = DatabaseNotification::query()->where('created_at', '<', now()->subDays(90))
            ->whereNot(fn (Builder $q) => $q->where('type', DealCommentCreated::class)->where(fn (Builder $q) => $q
                ->whereJsonContains('data', ['email_status' => 'pending'])->orWhereJsonContains('data', ['email_status' => 'queued'])))
            ->delete();

        $this->info("Deleted {$files->count()} import files and {$notifications} notifications.");

        return self::SUCCESS;
    }
}
