<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\CustomerActivity;
use App\Models\DealComment;
use App\Models\DealCommentRevision;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use stdClass;

class TransactionTimeline
{
    /** @return array<string, mixed> */
    public function paginate(DealTransaction $deal, User $actor, int $page = 1): array
    {
        Gate::forUser($actor)->authorize('view', $deal);
        abort_if($actor->role === UserRole::BranchManager, 403);

        $events = DB::table('stage_histories')->where('deal_transaction_id', $deal->id)
            ->selectRaw("id, 'stage' as kind, created_at as occurred_at")
            ->unionAll(DB::table('customer_activities')->where('deal_transaction_id', $deal->id)
                ->selectRaw("id, 'activity' as kind, occurred_at"))
            ->unionAll(DB::table('deal_comments')->where('deal_transaction_id', $deal->id)
                ->selectRaw("id, 'comment' as kind, created_at as occurred_at"));
        $paginator = DB::query()->fromSub($events, 'timeline_events')
            ->orderBy('occurred_at')->orderBy('kind')->orderBy('id')->paginate(20, ['*'], 'timeline_page', $page);
        $rows = $paginator->getCollection();
        $stages = StageHistory::with('actor')->whereIn('id', $rows->where('kind', 'stage')->pluck('id'))->get()->keyBy('id');
        $activities = CustomerActivity::with('user')->whereIn('id', $rows->where('kind', 'activity')->pluck('id'))->get()->keyBy('id');
        $commentQuery = DealComment::with(['author', 'parent.author'])
            ->whereIn('id', $rows->where('kind', 'comment')->pluck('id'));
        if ($actor->role === UserRole::Admin) {
            $commentQuery->with(['revisions' => fn ($q) => $q->with('editor')->orderBy('edited_at')->orderBy('id')]);
        }
        $comments = $commentQuery->get()->keyBy('id');

        $data = $rows->map(function (stdClass $row) use ($stages, $activities, $comments, $actor): array {
            $base = ['key' => $row->kind.'-'.$row->id, 'kind' => $row->kind];
            if ($row->kind === 'stage') {
                $stage = $stages->get($row->id) ?? abort(409, 'Riwayat berubah. Muat ulang.');

                return [...$base, 'occurred_at' => $stage->created_at->toIso8601String(),
                    'actor_name' => $stage->actor?->name, 'body' => $stage->notes,
                    'label' => ($stage->from_stage ? $stage->from_stage->label().' → ' : '').$stage->to_stage->label()];
            }
            if ($row->kind === 'activity') {
                $activity = $activities->get($row->id) ?? abort(409, 'Riwayat berubah. Muat ulang.');

                return [...$base, 'occurred_at' => $activity->occurred_at->toIso8601String(),
                    'actor_name' => $activity->user?->name, 'body' => $activity->notes, 'label' => $activity->type->label()];
            }
            $comment = $comments->get($row->id) ?? abort(409, 'Riwayat berubah. Muat ulang.');
            $parent = $comment->parent;
            // Legacy malformed parents must never reveal a different transaction.
            $parent = $parent?->deal_transaction_id === $comment->deal_transaction_id ? $parent : null;
            $serialized = [
                'id' => $comment->id, 'body' => $comment->body, 'author_name' => $comment->author?->name,
                'created_at' => $comment->created_at?->toIso8601String(), 'edited_at' => $comment->edited_at?->toIso8601String(),
                'stage_at_creation' => $comment->stage_at_creation?->value,
                'stage_at_creation_label' => $comment->stage_at_creation?->label(),
                'can_edit' => $actor->can('update', $comment), 'parent_id' => $parent?->id,
                'parent_body' => $parent?->body, 'parent_author_name' => $parent?->author?->name,
            ];
            if ($actor->role === UserRole::Admin) {
                $serialized['revisions'] = $comment->revisions->map(fn (DealCommentRevision $revision): array => [
                    'id' => $revision->id, 'old_body' => $revision->old_body,
                    'edited_at' => $revision->edited_at->toIso8601String(), 'editor_name' => $revision->editor?->name,
                ])->all();
            }

            return [...$base, 'occurred_at' => $serialized['created_at'], 'actor_name' => $serialized['author_name'],
                'body' => $comment->body, 'label' => $parent ? 'Balasan' : 'Komentar', 'comment' => $serialized];
        })->all();

        return ['data' => $data, 'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(), 'total' => $paginator->total()];
    }
}
