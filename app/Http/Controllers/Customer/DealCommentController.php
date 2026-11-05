<?php

namespace App\Http\Controllers\Customer;

use App\Actions\QueueCoachingEmail;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreDealCommentRequest;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DealCommentController extends Controller
{
    public function index(Request $request, DealTransaction $transaction): Response
    {
        $this->authorize('view', $transaction);
        /** @var User $actor */
        $actor = $request->user();
        $serialize = fn (DealComment $comment): array => [
            'id' => $comment->id,
            'body' => $comment->body,
            'author_name' => $comment->author?->name,
            'created_at' => $comment->created_at?->toIso8601String(),
            'stage_at_creation_label' => $comment->stage_at_creation?->label(),
            'can_edit' => $actor->can('update', $comment),
        ];

        return Inertia::render('transactions/coaching', [
            'transaction' => [
                'public_id' => $transaction->public_id,
                'vehicle_model' => $transaction->vehicle_model,
                'stage_label' => $transaction->current_stage->label(),
                'can_comment' => $actor->can('create', [DealComment::class, $transaction]),
                'comments' => $transaction->comments()->whereNull('parent_id')
                    ->with(['author', 'replies' => fn ($replies) => $replies->with('author')->oldest('id')])
                    ->oldest('id')->get()->map(fn (DealComment $comment): array => [
                        ...$serialize($comment),
                        'replies' => $comment->replies->map($serialize)->all(),
                    ])->all(),
            ],
        ]);
    }

    public function store(StoreDealCommentRequest $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($actor, $transaction, $validated): void {
            $deal = DealTransaction::query()->lockForUpdate()->findOrFail($transaction->id);
            $this->authorize('create', [DealComment::class, $deal]);

            if (! empty($validated['parent_id']) && ! $deal->comments()
                ->whereKey($validated['parent_id'])->whereNull('parent_id')->exists()) {
                throw ValidationException::withMessages(['parent_id' => 'Balasan harus merujuk komentar utama pada transaksi ini.']);
            }

            $comment = $deal->comments()->create([
                'user_id' => $actor->id,
                'parent_id' => $validated['parent_id'] ?? null,
                'body' => $validated['body'],
                'stage_at_creation' => $deal->current_stage,
            ]);

            $teamIds = TeamMembership::query()->where('user_id', $deal->sales_id)
                ->where('role', UserRole::Sales)->whereNull('ended_at')->select('team_id');
            $recipients = User::query()->where('dealer_id', $deal->dealer_id)->where('is_active', true)
                ->where('id', '!=', $actor->id)
                ->where(function (Builder $query) use ($deal, $teamIds): void {
                    $query->where(function (Builder $query) use ($deal): void {
                        $query->whereKey($deal->sales_id)->where('role', UserRole::Sales);
                    })->orWhere(function (Builder $query) use ($teamIds): void {
                        $query->where('role', UserRole::Supervisor)
                            ->whereHas('activeTeamMemberships', fn ($memberships) => $memberships
                                ->where('role', UserRole::Supervisor)->whereIn('team_id', $teamIds));
                    });
                })->get()->filter(fn (User $recipient): bool => $recipient->can('create', [DealComment::class, $deal]));

            $notification = new DealCommentCreated($deal->id, $deal->public_id, $comment->id, $actor->id, $deal->current_stage->value);
            Notification::sendNow($recipients, $notification, ['database']);
            DB::afterCommit(function () use ($comment): void {
                $queueEmail = app(QueueCoachingEmail::class);
                DatabaseNotification::query()->where('type', DealCommentCreated::class)
                    ->whereJsonContains('data', ['comment_id' => $comment->id])->get()
                    ->each(fn (DatabaseNotification $record) => $queueEmail($record->id));
            });
        });

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
