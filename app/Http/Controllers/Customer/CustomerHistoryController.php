<?php

namespace App\Http\Controllers\Customer;

use App\Enums\PipelineStage;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\User;
use App\Services\TransactionTimeline;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerHistoryController extends Controller
{
    public function __invoke(Request $request, Customer $customer, TransactionTimeline $timeline): JsonResponse
    {
        $this->authorize('view', $customer);
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'transaction' => ['sometimes', 'required', 'uuid'],
            'activity_page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'timeline_page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
        ]);
        $deals = $customer->transactions()->visibleTo($actor)
            ->orderByRaw('CASE WHEN current_stage IN (?, ?, ?) THEN 1 ELSE 0 END', PipelineStage::closedValues())
            ->orderByDesc('id')->get();
        $selected = isset($validated['transaction']) ? $deals->firstWhere('public_id', $validated['transaction']) : $deals->first();
        abort_if(isset($validated['transaction']) && $selected === null, 403);

        $serialize = fn (DealTransaction $deal): array => [
            'id' => $deal->id, 'public_id' => $deal->public_id, 'vehicle_model' => $deal->vehicle_model,
            'current_stage' => $deal->current_stage->value, 'stage_label' => $deal->current_stage->label(),
            'is_closed' => $deal->current_stage->isClosed(), 'is_stagnant' => $deal->is_stagnant,
            'can_record_do' => $deal->current_stage === PipelineStage::Spk && $actor->can('recordDo', $deal),
            'stage_event_id' => $deal->current_stage === PipelineStage::Spk ? $deal->stageEventId() : null,
            'estimated_value' => $deal->estimated_value, 'expected_closing_month' => $deal->expected_closing_month?->format('Y-m'),
            'can_comment' => $actor->can('create', [DealComment::class, $deal]), 'comments' => [],
        ];
        $activities = $customer->activities()->where(function (Builder $q) use ($actor): void {
            $q->whereNull('deal_transaction_id')->orWhereIn('deal_transaction_id', DealTransaction::query()->visibleTo($actor)->select('id'));
        })->with('user')->reorder()->orderBy('occurred_at')->orderBy('id')
            ->paginate(20, ['*'], 'activity_page', (int) ($validated['activity_page'] ?? 1));

        return response()->json([
            'transactions' => $deals->map($serialize)->all(), 'selected_transaction' => $selected ? $serialize($selected) : null,
            'activities' => ['data' => $activities->getCollection()->map(fn (CustomerActivity $activity): array => [
                'id' => $activity->id, 'type' => $activity->type->value, 'type_label' => $activity->type->label(),
                'notes' => $activity->notes, 'occurred_at' => $activity->occurred_at->toIso8601String(),
                'user_name' => $activity->user?->name,
            ])->all(), 'current_page' => $activities->currentPage(), 'last_page' => $activities->lastPage(), 'total' => $activities->total()],
            'timeline' => $selected ? $timeline->paginate($selected, $actor, (int) ($validated['timeline_page'] ?? 1))
                : ['data' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0],
        ])->header('Cache-Control', 'private, no-store');
    }
}
