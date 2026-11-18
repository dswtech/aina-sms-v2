<?php

namespace App\Notifications;

use App\Enums\PipelineStage;
use Illuminate\Notifications\Notification;

class DealStageChanged extends Notification
{
    // Only metadata enters notification data; no customer name or comment text.
    public function __construct(
        public readonly int $transactionId,
        public readonly string $transactionPublicId,
        public readonly string $fromStage,
        public readonly string $toStage,
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
            'kind' => 'stage_changed',
            'title' => 'Tahap transaksi berubah',
            'message' => 'Transaksi pindah dari '.PipelineStage::from($this->fromStage)->label().' ke '.PipelineStage::from($this->toStage)->label().'.',
            'url' => route('transactions.coaching', $this->transactionPublicId, false),
            'deal_id' => $this->transactionId,
        ];
    }
}
