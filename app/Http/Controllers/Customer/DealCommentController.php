<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreDealCommentRequest;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

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

        $transaction->comments()->create([
            'user_id' => $actor->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
        ]);

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
