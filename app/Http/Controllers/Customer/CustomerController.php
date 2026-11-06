<?php

namespace App\Http\Controllers\Customer;

use App\Enums\ActivityType;
use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\ReassignCustomerRequest;
use App\Http\Requests\Customer\StoreCustomerActivityRequest;
use App\Http\Requests\Customer\StoreCustomerLeadRequest;
use App\Http\Requests\Customer\StoreCustomerTransactionRequest;
use App\Http\Requests\Customer\StoreFollowUpRequest;
use App\Http\Requests\Customer\UpdateDealStageRequest;
use App\Models\Customer;
use App\Models\DealComment;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\CustomerDuplicateDetector;
use App\Support\AuditRecorder;
use App\Support\PhoneNormalizer;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();

        $search = $request->input('search');
        $tab = $request->input('tab', 'all');

        $baseQuery = Customer::query()->visibleTo($actor);
        $todayStart = CarbonImmutable::now('Asia/Jakarta')->startOfDay()->utc();
        $tomorrowStart = $todayStart->setTimezone('Asia/Jakarta')->addDay()->utc();

        // Precalculate counts for tab badges
        $counts = [
            'all' => (clone $baseQuery)->count(),
            'follow_up_today' => (clone $baseQuery)->whereHas('followUps', function (Builder $q) use ($todayStart, $tomorrowStart): void {
                $q->where('status', 'pending')
                    ->where('scheduled_at', '>=', $todayStart)->where('scheduled_at', '<', $tomorrowStart);
            })->count(),
            'overdue' => (clone $baseQuery)->whereHas('followUps', function (Builder $q) use ($todayStart): void {
                $q->where('status', 'pending')
                    ->where('scheduled_at', '<', $todayStart);
            })->count(),
            'uncontacted' => (clone $baseQuery)->whereNull('last_contact_at')->count(),
            'stagnant' => (clone $baseQuery)->whereHas('transactions', function (Builder $q) use ($actor): void {
                $q->visibleTo($actor)->stagnant();
            })->count(),
            'active' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->count(),
            'purchased' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            })->count(),
            'inactive' => (clone $baseQuery)->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->where(function (Builder $q): void {
                $q->whereNull('last_contact_at')
                    ->orWhere('last_contact_at', '<=', CarbonImmutable::now()->subDays(30));
            })->count(),
            'repeat_order' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            })->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->count(),
            'referral' => (clone $baseQuery)->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            })->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->where('opt_out', false)->count(),
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
            'follow_up_today' => $query->whereHas('followUps', function (Builder $q) use ($todayStart, $tomorrowStart): void {
                $q->where('status', 'pending')
                    ->where('scheduled_at', '>=', $todayStart)->where('scheduled_at', '<', $tomorrowStart);
            }),
            'overdue' => $query->whereHas('followUps', function (Builder $q) use ($todayStart): void {
                $q->where('status', 'pending')
                    ->where('scheduled_at', '<', $todayStart);
            }),
            'uncontacted' => $query->whereNull('last_contact_at'),
            'stagnant' => $query->whereHas('transactions', function (Builder $q) use ($actor): void {
                $q->visibleTo($actor)->stagnant();
            }),
            'active' => $query->whereHas('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            }),
            'purchased' => $query->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            }),
            'inactive' => $query->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->where(function (Builder $q): void {
                $q->whereNull('last_contact_at')
                    ->orWhere('last_contact_at', '<=', CarbonImmutable::now()->subDays(30));
            }),
            'repeat_order' => $query->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            })->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            }),
            'referral' => $query->whereHas('transactions', function (Builder $q): void {
                $q->whereIn('current_stage', [PipelineStage::Do->value, PipelineStage::Delivery->value]);
            })->whereDoesntHave('transactions', function (Builder $q): void {
                $q->whereNotIn('current_stage', PipelineStage::closedValues());
            })->where('opt_out', false),
            default => null,
        };

        $sort = $request->string('sort')->toString();
        $direction = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';
        $sort = in_array($sort, ['name', 'last_contact_at', 'updated_at'], true) ? $sort : 'updated_at';

        $customers = $query->with(['activeAssignment.sales', 'transactions' => fn ($q) => $q->visibleTo($actor), 'nextFollowUp'])
            ->orderBy($sort, $direction)
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Customer $c) use ($actor): array {
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
                        'can_record_do' => $deal->current_stage === PipelineStage::Spk && $actor->can('recordDo', $deal),
                        'stage_event_id' => $deal->current_stage === PipelineStage::Spk ? $deal->stageEventId() : null,
                        'is_stagnant' => $deal->is_stagnant,
                        'estimated_value' => $deal->estimated_value,
                        'expected_closing_month' => $deal->expected_closing_month?->format('Y-m'),
                        'can_comment' => $actor->can('create', [DealComment::class, $deal]),
                    ] : null,
                    'next_follow_up' => $c->nextFollowUp ? [
                        'id' => $c->nextFollowUp->id,
                        'scheduled_at' => $c->nextFollowUp->scheduled_at->toIso8601String(),
                        'plan_notes' => $c->nextFollowUp->plan_notes,
                        'status' => $c->nextFollowUp->status,
                    ] : null,
                ];
            });

        $assignableSales = [];
        if (in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true)) {
            $salesQuery = User::query()
                ->where('dealer_id', $actor->dealer_id)
                ->where('is_active', true)
                ->where('role', UserRole::Sales);

            if ($actor->role === UserRole::Supervisor) {
                $teamIds = Team::query()->visibleTo($actor)->select('id');
                $salesQuery->whereHas('activeTeamMemberships', function (Builder $q) use ($teamIds): void {
                    $q->whereIn('team_id', $teamIds)->whereNull('ended_at');
                });
            }

            $assignableSales = $salesQuery
                ->select(['id', 'public_id', 'name'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'public_id' => $user->public_id,
                    'name' => $user->name,
                ])
                ->all();
        }

        return Inertia::render('customers/index', [
            'duplicateLead' => $request->session()->has('duplicate_lead_phone') ? [
                'phone' => $request->session()->get('duplicate_lead_phone'),
                'customers' => Customer::query()->visibleTo($actor)
                    ->where('phone', PhoneNormalizer::normalize($request->session()->get('duplicate_lead_phone')))
                    ->orderBy('name')->get(['public_id', 'name'])->toArray(),
            ] : null,
            'customers' => $customers,
            'filters' => [
                'search' => $search ?? '',
                'tab' => $tab,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'counts' => $counts,
            'assignableSales' => $assignableSales,
        ]);
    }

    public function store(StoreCustomerLeadRequest $request, CustomerDuplicateDetector $detector): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $dealerId = (int) $actor->dealer_id;

        $validated = $request->validated();
        $customer = DB::transaction(function () use ($actor, $dealerId, $validated, $detector, $request): Customer {
            // The same dealer lock serializes manual creation and CSV imports.
            Dealer::query()->whereKey($dealerId)->lockForUpdate()->firstOrFail();
            if (isset($validated['existing_customer_id'])) {
                $customer = Customer::query()->where('dealer_id', $dealerId)
                    ->where('phone', PhoneNormalizer::normalize($validated['phone']))
                    ->where('public_id', $validated['existing_customer_id'])->lockForUpdate()->first();
                if ($customer === null) {
                    throw ValidationException::withMessages(['existing_customer_id' => 'Pelanggan tidak cocok dengan nomor ini. Periksa kembali.']);
                }
                $this->authorize('update', $customer);
                $this->createLeadTransaction($actor, $customer, $validated);

                return $customer;
            }
            if ($detector->check($dealerId, $validated['phone'])->hasDuplicate) {
                $request->session()->flash('duplicate_lead_phone', $validated['phone']);
                throw ValidationException::withMessages(['duplicate_customer' => 'Nomor telepon sudah terdaftar. Periksa pelanggan sebelum menyimpan.']);
            }
            $sales = $this->resolveLeadSales($actor, $validated);
            $customer = Customer::create([
                'dealer_id' => $dealerId,
                'created_by_id' => $actor->id,
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_channel_preference' => $validated['contact_channel_preference'] ?? null,
                'opt_out' => $validated['opt_out'] ?? false,
                'notes' => $validated['notes'] ?? null,
            ]);
            $customer->assignTo($sales, $actor, 'Penugasan saat pembuatan lead');
            $this->createLeadTransaction($actor, $customer, $validated);

            return $customer;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Lead {$customer->name} berhasil disimpan.",
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
        if (! empty($validated['deal_transaction_id'])) {
            abort_if($deal === null, 403);
            $this->authorize('view', $deal);
        }

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
        if (! empty($validated['deal_transaction_id'])) {
            abort_if($deal === null, 403);
            $this->authorize('view', $deal);
        }

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

    public function storeTransaction(StoreCustomerTransactionRequest $request, Customer $customer): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('update', $customer);

        $validated = $request->validated();

        $this->createLeadTransaction($actor, $customer, $validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Transaksi baru untuk {$customer->name} berhasil dibuat.",
        ]);

        return back();
    }

    /** @param array<string, mixed> $validated */
    private function resolveLeadSales(User $actor, array $validated): User
    {
        $role = $actor->role;
        $dealerId = $actor->dealer_id;
        $salesId = $role === UserRole::Sales ? $actor->id : (int) $validated['sales_id'];
        // Membership administration also locks users before changing placement.
        User::query()->where('dealer_id', $dealerId)->whereIn('id', [$actor->id, $salesId])->orderBy('id')->lockForUpdate()->get();
        $actor->refresh();
        abort_unless($actor->is_active && $actor->role === $role && $actor->dealer_id === $dealerId, 403);
        $sales = User::query()->whereKey($salesId)->where('dealer_id', $dealerId)->where('role', UserRole::Sales)->where('is_active', true)->first();
        $allowed = $sales !== null;
        if ($allowed && $role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->select('team_id');
            $allowed = $sales->activeTeamMemberships()->where('role', UserRole::Sales)->whereIn('team_id', $teamIds)
                ->whereHas('team', fn ($query) => $query->where('is_active', true))->exists();
        }
        if (! $allowed) {
            throw ValidationException::withMessages(['sales_id' => 'Pilih Sales aktif dalam cakupan Anda.']);
        }

        return $sales;
    }

    /** @param array<string, mixed> $validated */
    private function createLeadTransaction(User $actor, Customer $customer, array $validated): DealTransaction
    {
        $sales = $customer->assignedSales ?? $actor;
        if ($sales->role !== UserRole::Sales || ! $sales->is_active) {
            throw ValidationException::withMessages(['sales_id' => 'Pelanggan harus memiliki penugasan Sales aktif sebelum transaksi dibuat.']);
        }
        $membership = $sales->activeTeamMemberships()->where('role', UserRole::Sales)->with('team')->first();
        if ($membership !== null && ! $membership->team->is_active) {
            throw ValidationException::withMessages(['sales_id' => 'Tim Sales tidak aktif. Perbarui penempatan sebelum membuat transaksi.']);
        }

        return DB::transaction(function () use ($actor, $customer, $sales, $membership, $validated): DealTransaction {
            $deal = $customer->transactions()->create([
                'dealer_id' => $customer->dealer_id,
                'sales_id' => $sales->id,
                'team_id' => $membership?->team_id,
                'vehicle_model' => $validated['vehicle_model'],
                'estimated_value' => $validated['estimated_value'] ?? null,
                'expected_closing_month' => isset($validated['expected_closing_month']) ? $validated['expected_closing_month'].'-01' : null,
                'source' => $validated['source'],
                'current_stage' => PipelineStage::Lead,
                'last_activity_at' => now(),
            ]);

            $deal->stageHistories()->create([
                'from_stage' => null,
                'to_stage' => PipelineStage::Lead,
                'actor_id' => $actor->id,
                'notes' => $validated['notes'] ?? 'Transaksi baru dibuat',
                'created_at' => now(),
            ]);

            return $deal;
        });
    }

    public function reassign(ReassignCustomerRequest $request, Customer $customer): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('assign', $customer);

        $validated = $request->validated();

        $newSales = User::query()
            ->whereKey($validated['sales_id'])
            ->where('dealer_id', $customer->dealer_id)
            ->where('role', UserRole::Sales)
            ->where('is_active', true)
            ->firstOrFail();

        // Supervisor may only reassign within own team
        if ($actor->role === UserRole::Supervisor) {
            $teamIds = Team::query()->visibleTo($actor)->select('id');
            $inTeam = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('user_id', $newSales->id)
                ->where('role', UserRole::Sales)
                ->whereNull('ended_at')
                ->exists();

            if (! $inTeam) {
                abort(403);
            }
        }

        $customer->assignTo($newSales, $actor, $validated['notes'] ?? 'Penugasan ulang');

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Pelanggan {$customer->name} ditugaskan ke {$newSales->name}.",
        ]);

        return back();
    }

    public function updateContactPreferences(Request $request, Customer $customer): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('update', $customer);
        $validated = $request->validate([
            'contact_channel_preference' => ['present', 'nullable', 'string', 'in:whatsapp,phone,any'],
            'opt_out' => ['required', 'boolean'],
        ]);
        DB::transaction(function () use ($actor, $customer, $validated): void {
            $locked = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $this->authorize('update', $locked);
            $fields = ['contact_channel_preference', 'opt_out'];
            $before = $locked->only($fields);
            $locked->fill($validated);
            if ($locked->isDirty($fields)) {
                $locked->save();
                AuditRecorder::record($actor, 'customer.contact_preferences_updated', $locked, $before, $locked->only($fields));
            }
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Preferensi kontak berhasil diperbarui.']);

        return back();
    }

    public function updateStage(UpdateDealStageRequest $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $toStage = PipelineStage::from($validated['to_stage']);
        $options = $validated;
        if (! empty($validated['lost_reason'])) {
            $options['lost_reason'] = LostReason::from($validated['lost_reason']);
            $options['lost_notes'] = $validated['lost_notes'] ?? null;
        }

        DB::transaction(function () use ($transaction, $actor, $toStage, $validated, $options): void {
            $locked = DealTransaction::query()->lockForUpdate()->findOrFail($transaction->id);
            $this->authorize(match ($toStage) {
                PipelineStage::Do => 'recordDo',
                PipelineStage::Delivery => 'confirmDelivery',
                default => 'update',
            }, $locked);

            if ($toStage === PipelineStage::Delivery) {
                $this->assertCurrentDoEvent($locked, (int) $validated['do_event_id']);
            }
            if ($toStage === PipelineStage::Do && $locked->stageEventId() !== (int) $validated['stage_event_id']) {
                throw ValidationException::withMessages(['stage_event_id' => 'Riwayat tahap berubah. Muat ulang transaksi sebelum mencatat DO.']);
            }

            try {
                $locked->transitionTo($toStage, $actor, $validated['notes'] ?? null, $options);
            } catch (InvalidArgumentException $exception) {
                throw ValidationException::withMessages(['to_stage' => $exception->getMessage()]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Tahap transaksi berhasil diperbarui.',
        ]);

        return back();
    }

    public function cancelDo(Request $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        DB::transaction(function () use ($request, $transaction, $actor): void {
            $locked = DealTransaction::query()->lockForUpdate()->findOrFail($transaction->id);
            $this->authorize('cancelDo', $locked);
            $validated = $request->validate([
                'reason' => ['required', 'string', 'max:2000'],
                'do_event_id' => ['required', 'integer'],
            ]);
            $original = $this->assertCurrentDoEvent($locked, (int) $validated['do_event_id']);

            $locked->forceFill(['current_stage' => PipelineStage::Spk, 'last_activity_at' => now()])->save();
            $locked->stageHistories()->create([
                'from_stage' => PipelineStage::Do,
                'to_stage' => PipelineStage::Spk,
                'actor_id' => $actor->id,
                'notes' => $validated['reason'],
                'created_at' => now(),
                'reverses_stage_history_id' => $original->id,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'DO dibatalkan.']);

        return back();
    }

    private function assertCurrentDoEvent(DealTransaction $deal, int $expectedId): StageHistory
    {
        $event = $deal->currentDoEvent();
        if ($event === null || $event->id !== $expectedId) {
            throw ValidationException::withMessages(['do_event_id' => 'Riwayat DO berubah. Muat ulang transaksi sebelum mencoba lagi.']);
        }

        return $event;
    }
}
