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
use App\Services\TransactionTimeline;
use App\Support\AuditRecorder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DealCommentController extends Controller
{
    /** The conversation list, with one conversation open when a transaction is given. */
    public function index(Request $request, TransactionTimeline $timeline, ?DealTransaction $transaction = null): Response
    {
        if ($transaction !== null) {
            $this->authorize('view', $transaction);
        }
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'tab' => ['nullable', 'string', 'in:supervisor,sales,done'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim($validated['search'] ?? '');
        $ownTab = $actor->role === UserRole::Sales ? 'sales' : 'supervisor';
        $tab = $validated['tab'] ?? ($transaction?->latestComment === null ? $ownTab : $this->status($transaction));

        $query = DealTransaction::query()->visibleTo($actor)->has('comments');
        if ($search !== '') {
            $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
            $query->where(fn (Builder $q) => $q->whereRaw("lower(vehicle_model) like ? escape '\\'", [$like])
                ->orWhereHas('customer', fn (Builder $c) => $c->whereRaw("lower(name) like ? escape '\\'", [$like])));
        } else {
            $this->whereStatus($query, $tab);
        }
        $page = $query->with(['customer:id,name', 'sales:id,name', 'latestComment.author:id,name,role'])
            ->withMax('comments', 'created_at')->orderByDesc('comments_max_created_at')->orderByDesc('id')
            ->simplePaginate(20)->withQueryString();
        $leasings = DB::table('leasing_companies')
            ->whereIn('id', collect($page->items())->push($transaction)->pluck('leasing_id')->filter()->unique())->pluck('name', 'id');

        return Inertia::render('transactions/coaching', [
            'conversations' => $page->through(fn (DealTransaction $deal): array => [
                ...$this->summary($deal, $leasings),
                'status' => $this->status($deal),
                'author_name' => $deal->latestComment?->user_id === $actor->id ? 'Anda' : $deal->latestComment?->author?->name,
                'excerpt' => Str::limit(Str::squish((string) $deal->latestComment?->body), 90),
                'commented_at' => $deal->latestComment?->created_at?->toIso8601String(),
            ]),
            'counts' => collect(['supervisor', 'sales'])->mapWithKeys(fn (string $side): array => [
                $side => $this->whereStatus(DealTransaction::query()->visibleTo($actor)->has('comments'), $side)->count(),
            ])->all(),
            'tab' => $tab,
            'search' => $search,
            'timeline' => $transaction === null ? null : $timeline->paginate($transaction, $actor, newestFirst: true),
            'transaction' => $transaction === null ? null : [
                ...$this->summary($transaction, $leasings),
                'expected_closing_month' => $transaction->expected_closing_month?->format('Y-m'),
                'closed' => $transaction->coaching_closed_at !== null,
                'last_comment_id' => $transaction->comments()->max('id'),
                'can_update' => $actor->can('update', $transaction),
                'can_comment' => $actor->can('create', [DealComment::class, $transaction]),
                'can_close' => $actor->can('closeCoaching', $transaction),
            ],
        ]);
    }

    public function close(Request $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'closed' => ['required', 'boolean'],
            'last_comment_id' => ['required_if_accepted:closed', 'nullable', 'integer'],
        ]);
        $closed = (bool) $validated['closed'];
        DB::transaction(function () use ($actor, $transaction, $validated, $closed): void {
            $deal = DealTransaction::query()->lockForUpdate()->findOrFail($transaction->id);
            $this->authorize('closeCoaching', $deal);
            // Closing from a stale screen would bury a reply the Supervisor has not seen.
            if ($closed && (int) $deal->comments()->max('id') !== (int) $validated['last_comment_id']) {
                throw ValidationException::withMessages(['last_comment_id' => 'Ada komentar baru. Muat ulang sebelum menandai selesai.']);
            }
            $deal->update(['coaching_closed_at' => $closed ? now() : null]);
            if ($deal->customer !== null) {
                AuditRecorder::record($actor, $closed ? 'coaching.closed' : 'coaching.reopened', $deal->customer, context: ['transaction_public_id' => $deal->public_id]);
            }
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => $closed ? 'Percakapan ditandai selesai.' : 'Percakapan dibuka lagi.']);

        return back();
    }

    /** Whose turn it is: the side that did not write the last comment, or done. */
    private function status(DealTransaction $deal): string
    {
        return match (true) {
            $deal->coaching_closed_at !== null => 'done',
            $deal->latestComment?->author?->role === UserRole::Sales => 'supervisor',
            default => 'sales',
        };
    }

    /**
     * Same rule as status(), in SQL.
     *
     * @param  Builder<DealTransaction>  $query
     * @return Builder<DealTransaction>
     */
    private function whereStatus(Builder $query, string $status): Builder
    {
        $bySales = fn (Builder $author) => $author->where('role', UserRole::Sales);

        return match ($status) {
            'done' => $query->whereNotNull('coaching_closed_at'),
            'supervisor' => $query->whereNull('coaching_closed_at')->whereHas('latestComment.author', $bySales),
            default => $query->whereNull('coaching_closed_at')->whereDoesntHave('latestComment.author', $bySales),
        };
    }

    /**
     * @param  Collection<array-key, mixed>  $leasings
     * @return array<string, mixed>
     */
    private function summary(DealTransaction $deal, Collection $leasings): array
    {
        return [
            'public_id' => $deal->public_id,
            'customer_name' => $deal->customer?->name,
            'vehicle_model' => $deal->vehicle_model,
            'sales_name' => $deal->sales?->name,
            'stage_label' => $deal->current_stage->label(),
            'financing' => [
                'type' => $deal->financing_type, 'leasing_id' => $deal->leasing_id, 'leasing_name' => $leasings[$deal->leasing_id] ?? null,
                'other_name' => $deal->financing_other_name, 'tenor_months' => $deal->tenor_months, 'insurance_type' => $deal->insurance_type,
            ],
        ];
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
            // A new comment always brings the conversation back to the active list.
            if ($deal->coaching_closed_at !== null) {
                $deal->update(['coaching_closed_at' => null]);
            }

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
