<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ReleaseAnnounced extends Notification
{
    public function __construct(public readonly string $version, public readonly string $summary) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'release',
            'title' => 'Versi baru: v'.$this->version,
            'message' => $this->summary,
            'url' => route('releases.index', [], false),
            'version' => $this->version,
        ];
    }
}
