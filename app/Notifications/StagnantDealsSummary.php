<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class StagnantDealsSummary extends Notification
{
    public function __construct(public readonly int $count) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string|int> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'stagnant_summary',
            'title' => 'Transaksi stagnan baru',
            'message' => $this->count.' transaksi baru menjadi stagnan.',
            'url' => route('transactions.index', ['tab' => 'stagnant', 'date_from' => '', 'date_to' => ''], false),
            'count' => $this->count,
        ];
    }
}
