<?php

namespace App\Http\Controllers\Customer;

use App\Enums\ActivityType;
use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerActivityRequest;
use App\Http\Requests\Customer\StoreCustomerLeadRequest;
use App\Http\Requests\Customer\StoreFollowUpRequest;
use App\Http\Requests\Customer\UpdateDealStageRequest;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use App\Services\CustomerDuplicateDetector;
use App\Support\PhoneNormalizer;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();

        $search = $request->input('search');
        $tab = $request->input('tab', 'all');

        $baseQuery = Customer::query()->visibleTo($actor);

        // Precalculate counts for tab badges
        $counts = [
            'all' => (clone $baseQuery)->count(),
            'follow_up_today' => (clone $baseQuery)->whereHas('followUps', function (Builder $q): void {
                $q->where('status', 'pending')
                    ->whereDate('scheduled_at', CarbonImmutable::today());
            })->count(),
            'uncontacted' => (clone $baseQuery)->whereNull('last_contact_at')->count(),
            'active' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value]);
            })->count(),
            'purchased' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->where('current_stage', PipelineStage::Delivery->value);
            })->count(),
        ];

        $query = Customer::query()->visibleTo($actor);

        if (! empty($search)) {
            $normalizedSearch = PhoneNormalizer::normalize($search) ?? $search;
            $query->where(function (Builder $q) use ($search, $normalizedSearch): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$normalizedSearch}%");
            });
        }

        match ($tab) {
            'follow_up_today' => $query->whereHas('followUps', function (Builder $q): void {
                $q->where('status', 'pending')
                    ->whereDate('scheduled_at', CarbonImmutable::today());
            }),
            'uncontacted' => $query->whereNull('last_contact_at'),
            'active' => $query->whereHas('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value]);
            }),
            'purchased' => $query->whereHas('transactions', function (Builder $q): void {
                $q->where('current_stage', PipelineStage::Delivery->value);
            }),
            default => null,
        };

        $sort = $request->string('sort')->toString();
        $direction = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';
        $sort = in_array($sort, ['name', 'last_contact_at', 'updated_at'], true) ? $sort : 'updated_at';

        $customers = $query->with(['activeAssignment.sales', 'transactions.stageHistories.actor', 'activities.user', 'nextFollowUp'])
            ->orderBy($sort, $direction)
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Customer $c): array {
                // Pick the most recent open deal, falling back to the most recent closed one.
                $deal = $c->transactions
                    ->sortByDesc('id')
                    ->sortBy(fn (DealTransaction $d): int => $d->current_stage->isClosed() ? 1 : 0)
                    ->first();

                return [
                    'public_id' => $c->public_id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'email' => $c->email,
                    'address' => $c->address,
                    'contact_channel_preference' => $c->contact_channel_preference,
                    'opt_out' => $c->opt_out,
                    'last_contact_at' => $c->last_contact_at?->toIso8601String(),
                    'notes' => $c->notes,
                    'assigned_sales' => $c->assignedSales ? [
                        'public_id' => $c->assignedSales->public_id,
                        'name' => $c->assignedSales->name,
                        'username' => $c->assignedSales->username,
                    ] : null,
                    'active_deal' => $deal ? [
                        'id' => $deal->id,
                        'public_id' => $deal->public_id,
                        'vehicle_model' => $deal->vehicle_model,
                        'current_stage' => $deal->current_stage->value,
                        'stage_label' => $deal->current_stage->label(),
                        'is_closed' => $deal->current_stage->isClosed(),
                        'is_stagnant' => $deal->is_stagnant,
                        'estimated_value' => $deal->estimated_value,
                    ] : null,
                    'next_follow_up' => $c->nextFollowUp ? [
                        'id' => $c->nextFollowUp->id,
                        'scheduled_at' => $c->nextFollowUp->scheduled_at->toIso8601String(),
                        'plan_notes' => $c->nextFollowUp->plan_notes,
                        'status' => $c->nextFollowUp->status,
                    ] : null,
                    'stage_history' => $deal
                        ? $deal->stageHistories->map(fn (StageHistory $history): array => [
                            'from_stage' => $history->from_stage?->value,
                            'from_stage_label' => $history->from_stage?->label(),
                            'to_stage' => $history->to_stage->value,
                            'to_stage_label' => $history->to_stage->label(),
                            'notes' => $history->notes,
                            'actor_name' => $history->actor?->name,
                            'created_at' => $history->created_at->toIso8601String(),
                        ])->values()->all()
                        : [],
                    'recent_activities' => $c->activities->take(10)->map(fn (CustomerActivity $activity): array => [
                        'type' => $activity->type->value,
                        'type_label' => $activity->type->label(),
                        'notes' => $activity->notes,
                        'occurred_at' => $activity->occurred_at->toIso8601String(),
                        'user_name' => $activity->user?->name,
                    ])->values()->all(),
                ];
            });

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'filters' => [
                'search' => $search ?? '',
                'tab' => $tab,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'counts' => $counts,
        ]);
    }

    public function store(StoreCustomerLeadRequest $request, CustomerDuplicateDetector $detector): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $dealerId = (int) $actor->dealer_id;

        $validated = $request->validated();
        $duplicate = $detector->check($dealerId, $validated['phone']);

        $customer = DB::transaction(function () use ($actor, $dealerId, $validated): Customer {
            $customer = Customer::create([
                'dealer_id' => $dealerId,
                'created_by_id' => $actor->id,
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_channel_preference' => $validated['contact_channel_preference'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Assign to creating sales
            $customer->assignTo($actor, $actor, 'Penugasan saat pembuatan lead');

            // Create initial deal transaction (Lead)
            $deal = $customer->transactions()->create([
                'dealer_id' => $dealerId,
                'sales_id' => $actor->id,
                'vehicle_model' => $validated['vehicle_model'],
                'estimated_value' => $validated['estimated_value'] ?? null,
                'source' => $validated['source'],
                'current_stage' => PipelineStage::Lead,
                'last_activity_at' => now(),
            ]);

            // Create initial stage history
            $deal->stageHistories()->create([
                'from_stage' => null,
                'to_stage' => PipelineStage::Lead,
                'actor_id' => $actor->id,
                'notes' => 'Lead baru dibuat',
                'created_at' => now(),
            ]);

            return $customer;
        });

        $message = "Lead {$customer->name} berhasil disimpan.";

        if ($duplicate->hasDuplicate) {
            $message .= ' '.$duplicate->message;
        }

        Inertia::flash('toast', [
            'type' => $duplicate->hasDuplicate ? 'warning' : 'success',
            'message' => $message,
        ]);

        return redirect()->route('customers.index');
    }

    public function storeActivity(StoreCustomerActivityRequest $request, Customer $customer): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('view', $customer);

        $validated = $request->validated();
        $deal = ! empty($validated['deal_transaction_id'])
            ? $customer->transactions()->whereKey($validated['deal_transaction_id'])->first()
            : null;

        $occurredAt = ! empty($validated['occurred_at'])
            ? Carbon::parse($validated['occurred_at'])
            : now();

        $customer->logActivity(
            actor: $actor,
            type: ActivityType::from($validated['type']),
            notes: $validated['notes'],
            deal: $deal,
            occurredAt: $occurredAt,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Aktivitas berhasil dicatat.',
        ]);

        return back();
    }

    public function storeFollowUp(StoreFollowUpRequest $request, Customer $customer): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('view', $customer);

        $validated = $request->validated();
        $deal = ! empty($validated['deal_transaction_id'])
            ? $customer->transactions()->whereKey($validated['deal_transaction_id'])->first()
            : null;

        $scheduledAt = Carbon::parse($validated['scheduled_at']);

        $customer->scheduleFollowUp(
            actor: $actor,
            assignedTo: $customer->assignedSales ?? $actor,
            scheduledAt: $scheduledAt,
            planNotes: $validated['plan_notes'],
            deal: $deal,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Tindak lanjut berhasil dijadwalkan.',
        ]);

        return back();
    }

    public function updateStage(UpdateDealStageRequest $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('update', $transaction);

        $validated = $request->validated();

        $options = [];
        if (! empty($validated['booking_fee_confirmed'])) {
            $options['booking_fee_confirmed'] = true;
        }
        if (! empty($validated['lost_reason'])) {
            $options['lost_reason'] = LostReason::from($validated['lost_reason']);
            $options['lost_notes'] = $validated['lost_notes'] ?? null;
        }

        $transaction->transitionTo(
            toStage: PipelineStage::from($validated['to_stage']),
            actor: $actor,
            notes: $validated['notes'] ?? null,
            options: $options,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Tahap transaksi berhasil diperbarui.',
        ]);

        return back();
    }
}
