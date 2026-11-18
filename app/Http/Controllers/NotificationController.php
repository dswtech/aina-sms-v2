<?php

namespace App\Http\Controllers;

use App\Services\VisibleCoachingNotifications;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    private const HISTORY_LIMIT = 200;

    public function index(Request $request, VisibleCoachingNotifications $notifications): Response
    {
        $history = $notifications->historyFor($request->user());

        return Inertia::render('notifications/index', [
            'history' => $history->take(self::HISTORY_LIMIT)->map(fn (DatabaseNotification $n): array => $notifications->present($n))->values()->all(),
            'truncated' => $history->count() > self::HISTORY_LIMIT,
            'limit' => self::HISTORY_LIMIT,
        ]);
    }

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
