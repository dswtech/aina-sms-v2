<?php

namespace App\Notifications;

use App\Models\DealComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDealCommentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public DealComment $comment) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'deal_transaction_id' => $this->comment->deal_transaction_id,
            'comment_id' => $this->comment->id,
            'author_name' => $this->comment->author?->name,
            'message' => 'Komentar baru pada transaksi.',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $deal = $this->comment->deal;

        return (new MailMessage)
            ->subject('Komentar baru pada transaksi')
            ->line('Ada komentar baru pada transaksi '.$deal->vehicle_model.'.')
            ->line('Pelanggan: '.$deal->customer->name)
            ->line('Tahap: '.$deal->current_stage->label())
            ->action('Buka transaksi', url('/customers'))
            ->line('Email ini hanya memuat metadata aman, bukan isi coaching.');
    }
}
