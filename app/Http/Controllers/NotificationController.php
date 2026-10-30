<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function markRead(Request $request, DatabaseNotification $notification): RedirectResponse
    {
        $user = $request->user();
        if ($notification->notifiable_id !== $user?->id) {
            abort(403);
        }

        $notification->markAsRead();

        return back();
    }
}
