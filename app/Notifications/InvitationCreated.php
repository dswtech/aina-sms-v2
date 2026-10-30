<?php

namespace App\Notifications;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationCreated extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Invitation $invitation,
        public readonly string $plainToken,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Aktifkan akun DealDrive Supervisor')
            ->greeting('Halo '.$this->invitation->name.',')
            ->line('Admin dealer mengundang Anda untuk bergabung sebagai '.$this->invitation->role->value.'.')
            ->action('Aktifkan akun', route('invitations.show', $this->plainToken))
            ->line('Tautan ini hanya dapat digunakan sekali dan kedaluwarsa pada '.$this->invitation->expires_at->format('d M Y H:i').'.');
    }
}
