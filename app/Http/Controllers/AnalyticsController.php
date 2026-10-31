<?php

namespace App\Http\Controllers;

use App\Enums\PipelineStage;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        $data = $this->buildAnalytics($request, $actor);

        return Inertia::render('analytics/index', [
            'analytics' => $data,
        ]);
    }

    public function csv(Request $request): StreamedResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $data = $this->buildAnalytics($request, $actor);

        return response()->streamDownload(function () use ($data): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, ['Analisis Sumber']);
            fputcsv($handle, ['Sumber', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery', 'Conversion (%)']);
            foreach ($data['sources'] as $row) {
                fputcsv($handle, [
                    $row['source'],
                    $row['total'],
                    $row['share'],
                    $row['spk'],
                    $row['do'],
                    $row['delivery'],
                    $row['conversion'] ?? '',
                ]);
            }

            fputcsv($handle, []);
            fputcsv($handle, ['Analisis Model']);
            fputcsv($handle, ['Model', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery']);
            foreach ($data['models'] as $row) {
                fputcsv($handle, [
                    $row['model'],
                    $row['total'],
                    $row['share'],
                    $row['spk'],
                    $row['do'],
                    $row['delivery'],
                ]);
            }

            fclose($handle);
        }, "analisis-{$data['period']}-{$data['mode']}.csv", [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAnalytics(Request $request, User $actor): array
    {
        $period = $request->string('period')->toString() ?: now()->format('Y-m');
        $mode = $request->string('mode')->toString() === 'achievement' ? 'achievement' : 'acquisition';
        $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $query = DealTransaction::query()
            ->visibleTo($actor)
            ->with(['stageHistories', 'sales:id,name']);

        if ($mode === 'acquisition') {
            $query->whereBetween('created_at', [$start, $end]);
        } else {
            $query->whereHas('stageHistories', fn (Builder $history): Builder => $history
                ->whereBetween('created_at', [$start, $end]));
        }

        $deals = $query->get();
        $dimension = $request->string('dimension')->toString();
        $value = $request->string('value')->toString();

        $sourceGroups = $deals->groupBy('source');
        $modelGroups = $deals->groupBy('vehicle_model');
        $totalDeals = max(1, $deals->count());

        $sources = $sourceGroups->map(function (Collection $group, string $source) use ($mode, $start, $end, $totalDeals): array {
            $counts = $this->stageCounts($group, $mode, $start, $end);

            return [
                'source' => $source,
                'total' => $group->count(),
                'share' => round(($group->count() / $totalDeals) * 100, 1),
                ...$counts,
                'conversion' => $mode === 'acquisition'
                    ? round(($counts['delivery'] / max(1, $group->count())) * 100, 1)
                    : null,
            ];
        })->sortByDesc('total')->values()->all();

        $models = $modelGroups->map(function (Collection $group, string $model) use ($mode, $start, $end, $totalDeals): array {
            return [
                'model' => $model,
                'total' => $group->count(),
                'share' => round(($group->count() / $totalDeals) * 100, 1),
                ...$this->stageCounts($group, $mode, $start, $end),
            ];
        })->sortByDesc('total')->values()->all();

        $drilldown = $deals
            ->when($dimension === 'source' && $value !== '', fn (Collection $rows): Collection => $rows->where('source', $value))
            ->when($dimension === 'model' && $value !== '', fn (Collection $rows): Collection => $rows->where('vehicle_model', $value))
            ->map(fn (DealTransaction $deal): array => [
                'public_id' => $deal->public_id,
                'vehicle_model' => $deal->vehicle_model,
                'source' => $deal->source,
                'stage' => $deal->current_stage->value,
                'stage_label' => $deal->current_stage->label(),
                'sales_name' => $deal->sales?->name,
                'created_at' => $deal->created_at->toIso8601String(),
            ])->values()->all();

        return [
            'period' => $period,
            'mode' => $mode,
            'dimension' => in_array($dimension, ['source', 'model'], true) ? $dimension : null,
            'value' => $value ?: null,
            'sources' => $sources,
            'models' => $models,
            'drilldown' => $drilldown,
        ];
    }

    /**
     * @param  Collection<int, DealTransaction>  $deals
     * @return array{spk: int, do: int, delivery: int}
     */
    private function stageCounts(Collection $deals, string $mode, Carbon $start, Carbon $end): array
    {
        $count = function (PipelineStage $stage) use ($deals, $mode, $start, $end): int {
            return $deals->filter(function (DealTransaction $deal) use ($stage, $mode, $start, $end): bool {
                if ($mode === 'achievement') {
                    return $deal->stageHistories->contains(fn ($history): bool => $history->to_stage === $stage
                        && $history->created_at->betweenIncluded($start, $end));
                }

                return $deal->current_stage === $stage
                    || $deal->stageHistories->contains(fn ($history): bool => $history->to_stage === $stage);
            })->count();
        };

        return [
            'spk' => $count(PipelineStage::Spk),
            'do' => $count(PipelineStage::Do),
            'delivery' => $count(PipelineStage::Delivery),
        ];
    }
}
