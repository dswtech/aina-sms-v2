<?php

namespace App\Http\Controllers;

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Http\Requests\Customer\StoreCustomerLeadRequest;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\CreateLeadTransaction;
use App\Services\TransactionMasters;
use App\Services\TransactionMetadata;
use App\Services\TransactionTimeline;
use App\Support\AuditRecorder;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransactionController extends Controller
{
    public function update(Request $request, DealTransaction $transaction): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        DB::transaction(function () use ($request, $transaction, $actor): void {
            $locked = DealTransaction::query()->whereKey($transaction->id)->lockForUpdate()->firstOrFail();
            $this->authorize('update', $locked);
            Dealer::query()->whereKey($locked->dealer_id)->lockForUpdate()->firstOrFail();
            $validated = $request->validate([
                ...TransactionMetadata::rules(),
                'source' => ['sometimes', 'required', 'string', 'max:64'],
                // Unchanged legacy free text stays valid; anything new must come from the master.
                'vehicle_model' => ['sometimes', 'nullable', 'string', 'max:255', function (string $attribute, mixed $value, \Closure $fail) use ($locked): void {
                    if ($value !== $locked->vehicle_model) {
                        TransactionMasters::vehicleRule($locked->dealer_id)($attribute, $value, $fail);
                    }
                }],
                'notes' => ['nullable', 'string', 'max:2000'],
                'expected_closing_month' => ['nullable', 'date_format:Y-m'],
                'estimated_value' => ['nullable', 'integer', 'min:0'],
            ]);
            if (array_key_exists('vehicle_model', $validated) && blank($validated['vehicle_model']) && in_array($locked->current_stage, [PipelineStage::Spk, PipelineStage::Do, PipelineStage::Delivery], true)) {
                throw ValidationException::withMessages(['vehicle_model' => 'Kendaraan tidak boleh dikosongkan setelah tahap SPK.']);
            }
            $data = array_replace([
                'source' => $locked->source, 'source_channel' => $locked->source_channel,
                'area' => ['region_code' => $locked->region_code, 'district_code' => $locked->district_code, 'other_city' => $locked->other_city],
                'financing' => ['type' => $locked->financing_type, 'leasing_id' => $locked->financing_other_name !== null ? 'other' : $locked->leasing_id, 'other_name' => $locked->financing_other_name],
            ], $validated);
            $metadata = TransactionMetadata::normalize($data, $locked->dealer_id, requireActiveLeasing: array_key_exists('financing', $validated));
            $before = $locked->getAttributes();
            $fields = array_intersect_key($validated, array_flip(['source', 'vehicle_model', 'notes', 'estimated_value', 'expected_closing_month']));
            if (array_key_exists('expected_closing_month', $fields)) {
                $fields['expected_closing_month'] = $fields['expected_closing_month'] !== null ? $fields['expected_closing_month'].'-01' : null;
            }
            $locked->fill([...$fields, ...$metadata])->save();
            AuditRecorder::record($actor, 'transaction.metadata_updated', $locked->customer, $before, $locked->getAttributes());
        });

        return back();
    }

    /**
     * Single filter definition shared by the list and the CSV export.
     *
     * @return array{0: Builder<DealTransaction>, 1: array<string, mixed>}
     */
    private function filtered(Request $request, User $actor): array
    {
        // Absent date keys mean "this Jakarta month until today"; empty strings mean "no limit".
        $today = CarbonImmutable::now('Asia/Jakarta');
        if (! $request->has('date_from') && ! $request->has('date_to')) {
            $request->merge(['date_from' => $today->startOfMonth()->toDateString(), 'date_to' => $today->toDateString()]);
        }
        $validated = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('date_from') ? ['after_or_equal:date_from'] : [])],
            'source' => ['nullable', 'string', 'max:64'],
            'source_channel' => ['nullable', 'string', 'max:32'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'region_code' => ['nullable', 'string', 'max:16'],
            'district_code' => ['nullable', 'string', 'max:16'],
            'supervisor_id' => ['nullable', 'integer'],
        ]);

        $search = trim((string) $request->input('search', ''));
        $stage = $request->string('stage')->toString();
        $tab = $request->string('tab')->toString() ?: 'all';
        $salesId = $request->integer('sales_id') ?: null;
        $supervisorId = $actor->role === UserRole::Admin ? ($validated['supervisor_id'] ?? null) : null;

        if (! in_array($tab, ['all', 'active', 'stagnant', 'closed'], true)) {
            $tab = 'all';
        }

        if ($salesId !== null && ! in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true)) {
            $salesId = null;
        }

        if ($salesId !== null && $actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $allowed = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('user_id', $salesId)
                ->whereNull('ended_at')
                ->exists();
            if (! $allowed) {
                $salesId = null;
            }
        }

        $query = DealTransaction::query()->visibleTo($actor);
        if (! empty($validated['date_from'])) {
            $query->where('progress_at', '>=', CarbonImmutable::parse($validated['date_from'], 'Asia/Jakarta')->startOfDay()->utc());
        }
        if (! empty($validated['date_to'])) {
            $query->where('progress_at', '<', CarbonImmutable::parse($validated['date_to'], 'Asia/Jakarta')->startOfDay()->addDay()->utc());
        }
        foreach (['source', 'source_channel', 'region_code', 'district_code'] as $column) {
            if (isset($validated[$column]) && $validated[$column] !== '') {
                $query->where($column, $validated[$column]);
            }
        }
        if (! empty($validated['customer_name'])) {
            $needle = '%'.addcslashes(mb_strtolower($validated['customer_name']), '%_\\').'%';
            $query->whereHas('customer', fn ($q) => $q->whereRaw("lower(name) like ? escape '\\'", [$needle]));
        }
        if ($supervisorId !== null) {
            $query->whereIn('team_id', TeamMembership::query()->where('user_id', $supervisorId)
                ->where('role', UserRole::Supervisor)->whereNull('ended_at')->select('team_id'));
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->whereHas('customer', function ($customerQuery) use ($search): void {
                    $customerQuery->whereLike('name', "%{$search}%")
                        ->orWhereLike('phone', "%{$search}%");
                })->orWhereLike('vehicle_model', "%{$search}%")
                    ->orWhereLike('source', "%{$search}%");
            });
        }

        if ($stage !== '' && in_array($stage, array_column(PipelineStage::cases(), 'value'), true)) {
            $query->where('current_stage', $stage);
        }

        if ($salesId !== null) {
            $query->where('sales_id', $salesId);
        }

        match ($tab) {
            'active' => $query->whereNotIn('current_stage', PipelineStage::closedValues()),
            'stagnant' => $query->stagnant(),
            'closed' => $query->whereIn('current_stage', PipelineStage::closedValues()),
            default => null,
        };

        $query->orderByDesc('progress_at')->orderByDesc('id');

        return [$query, [
            'search' => $search, 'stage' => $stage, 'tab' => $tab, 'sales_id' => $salesId, 'supervisor_id' => $supervisorId,
            'date_from' => $validated['date_from'] ?? null, 'date_to' => $validated['date_to'] ?? null,
            'source' => $validated['source'] ?? null, 'source_channel' => $validated['source_channel'] ?? null,
            'customer_name' => $validated['customer_name'] ?? null,
            'region_code' => $validated['region_code'] ?? null, 'district_code' => $validated['district_code'] ?? null,
        ]];
    }

    /**
     * Area labels and the deal team's active Supervisors for a set of rows, in three queries.
     *
     * @param  iterable<DealTransaction>  $rows
     * @return array{0: array<string, string>, 1: array<string, string>, 2: array<array<int, array{id: int, name: string}>>}
     */
    private function lookups(iterable $rows): array
    {
        $rows = collect($rows);
        $regions = DB::table('area_regions')->whereIn('code', $rows->pluck('region_code')->filter()->unique())->pluck('name', 'code')->all();
        $districts = DB::table('area_districts')->whereIn('code', $rows->pluck('district_code')->filter()->unique())->pluck('name', 'code')->all();
        $supervisors = $this->supervisorsByTeam($rows->pluck('team_id')->filter()->unique()->values()->all());

        return [$regions, $districts, $supervisors];
    }

    /**
     * @param  array<mixed>  $teamIds
     * @return array<array<int, array{id: int, name: string}>>
     */
    private function supervisorsByTeam(array $teamIds): array
    {
        return TeamMembership::query()->whereIn('team_id', $teamIds)
            ->where('role', UserRole::Supervisor)->whereNull('ended_at')
            ->whereHas('user', fn ($q) => $q->where('is_active', true))
            ->with('user:id,name')->get()
            ->sortBy(fn (TeamMembership $m) => [mb_strtolower($m->user->name), $m->user_id])
            ->groupBy('team_id')
            ->map(fn ($group) => $group->map(fn (TeamMembership $m) => ['id' => $m->user->id, 'name' => $m->user->name])->values()->all())->all();
    }

    /**
     * Master name by id, including inactive leasing (history must stay readable).
     *
     * @param  iterable<DealTransaction>  $rows
     * @return array<int, string>
     */
    private function leasingNames(iterable $rows): array
    {
        $ids = collect($rows)->pluck('leasing_id')->filter()->unique()->values();

        return $ids->isEmpty() ? [] : DB::table('leasing_companies')->whereIn('id', $ids)->pluck('name', 'id')->all();
    }

    public function export(Request $request): StreamedResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        [$query] = $this->filtered($request, $actor);
        $query->with(['customer:id,name', 'sales:id,name']);

        return response()->streamDownload(function () use ($query): void {
            $out = fopen('php://output', 'w') ?: throw new \RuntimeException('Cannot open the response stream.');
            fwrite($out, "\xEF\xBB\xBF");
            $put = fn (array $row) => fputcsv($out, array_map(self::safeCell(...), $row), ';');
            $put(['Tanggal Progress', 'Pelanggan', 'Unit yang diminati', 'Tahap', 'Sumber', 'Kanal', 'Kabupaten/Kota', 'Kecamatan', 'Sales', 'Supervisor', 'Aktivitas terakhir', 'Keterangan']);
            // lazy() keeps the progress ordering and bounded memory; each 200-row chunk gets its own label lookups.
            foreach ($query->lazy(200)->chunk(200) as $chunk) {
                $rows = $chunk->values()->all();
                [$regions, $districts, $supervisors] = $this->lookups($rows);
                foreach ($rows as $t) {
                    $put([
                        $t->progress_at?->setTimezone('Asia/Jakarta')->format('Y-m-d'), $t->customer?->name, $t->vehicle_model, $t->current_stage->label(),
                        $t->source, $t->source_channel, $regions[$t->region_code] ?? $t->other_city, $districts[$t->district_code] ?? null,
                        $t->sales?->name, collect($supervisors[$t->team_id] ?? [])->pluck('name')->implode(', '),
                        $t->last_activity_at?->setTimezone('Asia/Jakarta')->format('Y-m-d'), $t->notes,
                    ]);
                }
            }
            fclose($out);
        }, 'transaksi.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private static function safeCell(mixed $value): mixed
    {
        return is_string($value) && $value !== '' && str_contains("=+-@\t\r", $value[0]) ? "'".$value : $value;
    }

    private const SOURCES = ['walk_in' => 'Walk-in Showroom', 'digital_ad' => 'Iklan Digital / Medsos', 'referral' => 'Referral Pelanggan', 'exhibition' => 'Pameran / Mall', 'call' => 'Telepon Masuk'];

    /**
     * @param  array<string, string>  $regions
     * @param  array<string, string>  $districts
     * @param  array<array<int, array{id: int, name: string}>>  $supervisors
     * @param  array<int, string>  $leasingNames
     * @return array<string, mixed>
     */
    private function row(DealTransaction $transaction, User $actor, array $regions, array $districts, array $supervisors, array $leasingNames = []): array
    {
        $confirmDelivery = $actor->can('confirmDelivery', $transaction);
        $cancelDo = $actor->can('cancelDo', $transaction);
        $doEvent = ($confirmDelivery || $cancelDo) ? $transaction->currentDoEvent() : null;

        return [
            'id' => $transaction->id,
            'public_id' => $transaction->public_id,
            'customer' => $transaction->customer ? [
                'name' => $transaction->customer->name,
                'phone' => $transaction->customer->phone,
            ] : null,
            'sales' => $transaction->sales ? [
                'name' => $transaction->sales->name,
                'username' => $transaction->sales->username,
            ] : null,
            'supervisors' => $supervisors[$transaction->team_id] ?? [],
            'vehicle_model' => $transaction->vehicle_model,
            'source' => $transaction->source,
            'source_channel' => $transaction->source_channel,
            'notes' => $transaction->notes,
            'area' => [
                'region_code' => $transaction->region_code, 'region_name' => $regions[$transaction->region_code] ?? null,
                'district_code' => $transaction->district_code, 'district_name' => $districts[$transaction->district_code] ?? null,
                'other_city' => $transaction->other_city,
            ],
            'financing' => [
                'type' => $transaction->financing_type, 'leasing_id' => $transaction->leasing_id, 'leasing_name' => $leasingNames[$transaction->leasing_id] ?? null, 'other_name' => $transaction->financing_other_name,
            ],
            'current_stage' => $transaction->current_stage->value,
            'stage_label' => $transaction->current_stage->label(),
            'estimated_value' => $transaction->estimated_value,
            'expected_closing_month' => $transaction->expected_closing_month?->format('Y-m'),
            'is_stagnant' => $transaction->is_stagnant,
            'last_activity_at' => $transaction->last_activity_at?->toIso8601String(),
            'progress_at' => $transaction->progress_at?->toIso8601String(),
            'created_at' => $transaction->created_at->toIso8601String(),
            'can_update' => ! $transaction->current_stage->isClosed() && $actor->can('update', $transaction),
            'can_record_do' => $transaction->current_stage === PipelineStage::Spk && $actor->can('recordDo', $transaction),
            'stage_event_id' => $transaction->current_stage === PipelineStage::Spk ? $transaction->stageEventId() : null,
            'can_confirm_delivery' => $confirmDelivery && $doEvent?->hasDoChecklist(),
            'can_cancel_do' => $cancelDo && $doEvent !== null,
            'do_event_id' => $doEvent?->id,
        ];
    }

    public function show(Request $request, DealTransaction $transaction): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorize('view', $transaction);
        $transaction->load(['customer:id,name,phone,social_media_account', 'sales:id,name,username']);
        [$regions, $districts, $supervisors] = $this->lookups([$transaction]);

        return response()->json([
            ...$this->row($transaction, $actor, $regions, $districts, $supervisors, $this->leasingNames([$transaction])),
            'customer' => [
                'name' => $transaction->customer?->name, 'phone' => $transaction->customer?->phone,
                'social_media_account' => $transaction->customer?->social_media_account,
            ],
            // Area and financing are editable until DO; DO/Delivery lock them, a cancelled DO returns to SPK.
            'can_edit_metadata' => $actor->can('update', $transaction),
            'history' => $actor->role === UserRole::BranchManager ? null : app(TransactionTimeline::class)->paginate($transaction, $actor),
        ]);
    }

    public function create(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless($actor->can('create', Customer::class), 403);
        $teamId = $actor->role === UserRole::Sales ? $actor->activeTeamMemberships()->value('team_id') : null;
        // Entry from the Customers page: same visibility and assignment rules as the search.
        $preselected = null;
        $requested = $request->query('customer');
        if (is_string($requested) && Str::isUuid($requested)) {
            $found = Customer::query()->visibleTo($actor)->whereHas('activeAssignment')
                ->with('activeAssignment.sales:id,name')->where('public_id', $requested)->first();
            $preselected = $found !== null ? $this->customerCard($found) : null;
        }

        return Inertia::render('transactions/create', [
            'vehicleOptions' => TransactionMasters::vehicleOptions($actor->dealer_id),
            'regions' => DB::table('area_regions')->orderBy('name')->get(['code', 'name']),
            'districts' => DB::table('area_districts')->orderBy('name')->get(['code', 'region_code', 'name']),
            'leasings' => DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'sources' => array_map(fn (string $value, string $label): array => compact('value', 'label'), array_keys(self::SOURCES), self::SOURCES),
            'assignableSales' => $this->assignableSales($actor),
            'preselected' => $preselected,
            'supervisors' => $teamId === null ? [] : $this->supervisorsByTeam([(int) $teamId])[$teamId] ?? [],
        ]);
    }

    public function store(StoreCustomerLeadRequest $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validated();
        $customer = app(CreateLeadTransaction::class)->createCustomerLead($actor, $validated);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Transaksi untuk {$customer->name} berhasil disimpan."]);

        return redirect()->route('transactions.index');
    }

    /** @return array<string, mixed> */
    private function customerCard(Customer $c): array
    {
        return [
            'public_id' => $c->public_id, 'name' => $c->name, 'phone' => $c->phone,
            'social_media_account' => $c->social_media_account,
            'assigned_sales' => ['name' => $c->activeAssignment?->sales?->name],
        ];
    }

    public function customerSearch(Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $term = trim($validated['q'] ?? '');
        $query = Customer::query()->visibleTo($actor)->whereHas('activeAssignment')
            ->with('activeAssignment.sales:id,name')->orderBy('name')->orderBy('id');
        if ($term !== '') {
            $like = '%'.addcslashes(mb_strtolower($term), '%_\\').'%';
            // Phones are stored as +62...; a typed 0812... becomes 62812... A partial number needs 4+ digits.
            // Only phone-looking text searches phones: "Avanza 2024" must not match numbers containing 2024.
            $digits = preg_match('/^[\d\s+\-()]+$/', $term) ? (preg_replace('/\D/', '', $term) ?? '') : '';
            $digits = str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
            $query->where(fn ($q) => $q->whereRaw("lower(name) like ? escape '\\'", [$like])
                ->when(strlen($digits) >= 4, fn ($q) => $q->orWhere('phone', 'like', '%'.$digits.'%')));
        }
        $page = $query->paginate(10, ['id', 'public_id', 'name', 'phone', 'social_media_account']);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Customer $c): array => $this->customerCard($c))->all(),
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(),
        ]);
    }

    /** @return array<int, array{id: int, name: string, username: string|null}> */
    private function assignableSales(User $actor): array
    {
        if (! in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true)) {
            return [];
        }
        $salesQuery = User::query()
            ->where('dealer_id', $actor->dealer_id)
            ->where('is_active', true)
            ->where('role', UserRole::Sales);

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = Team::query()->visibleTo($actor)->select('id');
            $salesQuery->whereHas('activeTeamMemberships', function ($query) use ($teamIds): void {
                $query->whereIn('team_id', $teamIds)->whereNull('ended_at');
            });
        }

        return $salesQuery->select(['id', 'name', 'username'])->orderBy('name')->get()
            ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name, 'username' => $user->username])->all();
    }

    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        [$query, $filters] = $this->filtered($request, $actor);
        $query->with(['customer:id,name,phone', 'sales:id,name,username']);

        $paginated = $query->paginate(15)->withQueryString();
        [$regions, $districts, $supervisors] = $this->lookups($paginated->items());
        $leasingNames = $this->leasingNames($paginated->items());
        $transactions = $paginated->through(fn (DealTransaction $transaction): array => $this->row($transaction, $actor, $regions, $districts, $supervisors, $leasingNames));

        $assignableSales = $this->assignableSales($actor);

        return Inertia::render('transactions/index', [
            'transactions' => $transactions,
            'vehicleOptions' => TransactionMasters::vehicleOptions($actor->dealer_id),
            'sourceOptions' => DealTransaction::query()->visibleTo($actor)->select('source')->distinct()->orderBy('source')->pluck('source')->all(),
            'filters' => $filters,
            'assignableSales' => $assignableSales,
            // Admin picks from every Supervisor (Branch Manager cannot open this page); a Supervisor only sees themself, locked.
            'supervisorOptions' => match ($actor->role) {
                UserRole::Admin => User::query()->where('dealer_id', $actor->dealer_id)->where('is_active', true)->where('role', UserRole::Supervisor)
                    ->orderBy('name')->get(['id', 'name'])->map(fn (User $u): array => ['id' => $u->id, 'name' => $u->name])->all(),
                UserRole::Supervisor => [['id' => $actor->id, 'name' => $actor->name]],
                default => [],
            },
            'supervisorLocked' => $actor->role === UserRole::Supervisor,
            'regions' => DB::table('area_regions')->orderBy('name')->get(['code', 'name']),
            'districts' => DB::table('area_districts')->orderBy('name')->get(['code', 'region_code', 'name']),
            'leasings' => DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'stages' => array_map(fn (PipelineStage $stage): array => [
                'value' => $stage->value,
                'label' => $stage->label(),
            ], PipelineStage::cases()),
            'lostReasons' => array_map(fn (LostReason $reason): array => [
                'value' => $reason->value,
                'label' => $reason->label(),
            ], LostReason::cases()),
        ]);
    }
}
