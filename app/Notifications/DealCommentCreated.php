<?php

namespace App\Notifications;

use App\Enums\PipelineStage;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DealCommentCreated extends Notification
{
    // Only metadata enters queue payloads, notification data or email.
    public function __construct(
        public readonly int $transactionId,
        public readonly string $transactionPublicId,
        public readonly int $commentId,
        public readonly int $authorId,
        public readonly string $stage,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        $deal = DealTransaction::query()->find($this->transactionId);

        return $notifiable instanceof User && $notifiable->is_active
            && $notifiable->id !== $this->authorId && $deal !== null
            && $notifiable->can('create', [DealComment::class, $deal]);
    }

    /** @return array<string, string|int> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'Komentar baru pada transaksi',
            'message' => 'Ada komentar baru pada tahap '.PipelineStage::from($this->stage)->label().'.',
            'url' => route('transactions.coaching', $this->transactionPublicId, false),
            'comment_id' => $this->commentId,
            'email_status' => 'pending',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Komentar baru pada transaksi')
            ->line('Ada komentar baru pada transaksi tahap '.PipelineStage::from($this->stage)->label().'.')
            ->action('Buka transaksi', route('transactions.coaching', $this->transactionPublicId))
            ->line('Masuk ke aplikasi untuk membaca komentar sesuai hak akses Anda.');
    }
}
