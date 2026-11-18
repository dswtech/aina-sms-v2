<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class DealBecameStagnant extends Notification
{
    // activity_at identifies the stagnation episode so the detector never notifies twice for it.
    public function __construct(
        public readonly int $transactionId,
        public readonly string $transactionPublicId,
        public readonly string $activityAt,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string|int> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'stagnant',
            'title' => 'Transaksi menjadi stagnan',
            'message' => 'Tidak ada aktivitas lebih dari 3 hari.',
            'url' => route('transactions.coaching', $this->transactionPublicId, false),
            'deal_id' => $this->transactionId,
            'activity_at' => $this->activityAt,
        ];
    }
}
