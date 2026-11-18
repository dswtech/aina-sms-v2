<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\ReleaseAnnounced;
use App\Support\Releases;
use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;

class AnnounceRelease extends Command
{
    protected $signature = 'release:announce';

    protected $description = 'Notify every active user of the current release; safe to run again for the same version';

    public function handle(): int
    {
        $release = Releases::current();
        if (! $release['notify']) {
            $this->info("v{$release['version']} does not notify users.");

            return self::SUCCESS;
        }

        // notifications.data is a text column, so the version is matched in PHP, not with a JSON query.
        // shortcut: a user created after the first run is notified on a re-run of the same version; accepted, rare.
        $already = DatabaseNotification::query()->where('type', ReleaseAnnounced::class)->get()
            ->filter(fn (DatabaseNotification $n): bool => ($n->data['version'] ?? null) === $release['version'])
            ->pluck('notifiable_id')->flip();

        $sent = 0;
        User::query()->where('is_active', true)->chunkById(200, function ($users) use ($release, $already, &$sent): void {
            foreach ($users->reject(fn (User $user): bool => $already->has($user->id)) as $user) {
                Notification::sendNow($user, new ReleaseAnnounced($release['version'], $release['summary']), ['database']);
                $sent++;
            }
        });

        $this->info("v{$release['version']} announced to {$sent} users.");

        return self::SUCCESS;
    }
}
