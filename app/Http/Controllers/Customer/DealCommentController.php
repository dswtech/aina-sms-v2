<?php

namespace App\Http\Controllers\Customer;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreDealCommentRequest;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\NewDealCommentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Notification;

class DealCommentController extends Controller
{
    public function store(StoreDealCommentRequest $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('view', $transaction);

        $validated = $request->validated();

        if (! empty($validated['parent_id'])) {
            $parent = DealComment::query()->whereKey($validated['parent_id'])->firstOrFail();
            if ($parent->deal_transaction_id !== $transaction->id) {
                abort(422);
            }
        }

        $comment = $transaction->comments()->create([
            'user_id' => $actor->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
        ]);

        $recipients = collect();
        if ($transaction->sales !== null && $transaction->sales->id !== $actor->id) {
            $recipients->push($transaction->sales);
        }

        $teamIds = TeamMembership::query()
            ->where('user_id', $transaction->sales_id)
            ->whereNull('ended_at')
            ->pluck('team_id');

        $supervisorIds = TeamMembership::query()
            ->whereIn('team_id', $teamIds)
            ->whereNull('ended_at')
            ->join('users', 'users.id', '=', 'team_memberships.user_id')
            ->where('users.role', UserRole::Supervisor->value)
            ->pluck('team_memberships.user_id');

        $supervisors = User::query()
            ->whereIn('id', $supervisorIds)
            ->where('id', '!=', $actor->id)
            ->get();

        $recipients = $recipients->merge($supervisors)->unique('id');

        Notification::send($recipients, new NewDealCommentNotification($comment));

        return back();
    }

    public function update(StoreDealCommentRequest $request, DealComment $comment): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('update', $comment);

        $validated = $request->validated();

        $comment->revisions()->create([
            'edited_by_id' => $actor->id,
            'old_body' => $comment->body,
            'edited_at' => now(),
        ]);

        $comment->update([
            'body' => $validated['body'],
            'edited_at' => now(),
        ]);

        return back();
    }
}
