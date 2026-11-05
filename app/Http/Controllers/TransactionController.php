<?php

namespace App\Http\Controllers;

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('date_from') ? ['after_or_equal:date_from'] : [])],
            'source' => ['nullable', 'string', 'max:64'],
        ]);

        $search = trim((string) $request->input('search', ''));
        $stage = $request->string('stage')->toString();
        $tab = $request->string('tab')->toString() ?: 'all';
        $salesId = $request->integer('sales_id') ?: null;

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

        $query = DealTransaction::query()
            ->visibleTo($actor)
            ->with(['customer:id,name,phone', 'sales:id,name,username']);
        if (! empty($validated['date_from'])) {
            $query->where('created_at', '>=', CarbonImmutable::parse($validated['date_from'], 'Asia/Jakarta')->startOfDay()->utc());
        }
        if (! empty($validated['date_to'])) {
            $query->where('created_at', '<', CarbonImmutable::parse($validated['date_to'], 'Asia/Jakarta')->startOfDay()->addDay()->utc());
        }
        if (isset($validated['source']) && $validated['source'] !== '') {
            $query->where('source', $validated['source']);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->whereHas('customer', function ($customerQuery) use ($search): void {
                    $customerQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })->orWhere('vehicle_model', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%");
            });
        }

        if ($stage !== '' && in_array($stage, array_column(PipelineStage::cases(), 'value'), true)) {
            $query->where('current_stage', $stage);
        }

        if ($salesId !== null) {
            $query->where('sales_id', $salesId);
        }

        match ($tab) {
            'active' => $query->whereNotIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value]),
            'stagnant' => $query->stagnant(),
            'closed' => $query->whereIn('current_stage', [PipelineStage::Delivery->value, PipelineStage::Lost->value]),
            default => null,
        };

        $transactions = $query
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (DealTransaction $transaction) use ($actor): array {
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
                    'vehicle_model' => $transaction->vehicle_model,
                    'source' => $transaction->source,
                    'current_stage' => $transaction->current_stage->value,
                    'stage_label' => $transaction->current_stage->label(),
                    'estimated_value' => $transaction->estimated_value,
                    'expected_closing_month' => $transaction->expected_closing_month?->format('Y-m'),
                    'is_stagnant' => $transaction->is_stagnant,
                    'last_activity_at' => $transaction->last_activity_at?->toIso8601String(),
                    'created_at' => $transaction->created_at->toIso8601String(),
                    'can_update' => ! $transaction->current_stage->isClosed() && $actor->can('update', $transaction),
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
                $salesQuery->whereHas('activeTeamMemberships', function ($query) use ($teamIds): void {
                    $query->whereIn('team_id', $teamIds)->whereNull('ended_at');
                });
            }

            $assignableSales = $salesQuery
                ->select(['id', 'name', 'username'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                ])->all();
        }

        return Inertia::render('transactions/index', [
            'transactions' => $transactions,
            'sourceOptions' => DealTransaction::query()->visibleTo($actor)->select('source')->distinct()->orderBy('source')->pluck('source')->all(),
            'filters' => [
                'search' => $search,
                'stage' => $stage,
                'tab' => $tab,
                'sales_id' => $salesId,
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
                'source' => $validated['source'] ?? null,
            ],
            'assignableSales' => $assignableSales,
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
