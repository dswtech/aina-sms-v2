<?php

namespace App\Http\Controllers;

use App\Enums\PipelineStage;
use App\Http\Requests\AnalyticsRequest;
use App\Models\DealTransaction;
use App\Models\User;
use App\Support\ReportingPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function index(AnalyticsRequest $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();
        $data = $this->buildAnalytics($request, $actor);

        return Inertia::render('analytics/index', [
            'analytics' => $data,
        ]);
    }

    public function csv(AnalyticsRequest $request): StreamedResponse
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
                    $this->csvLabel($row['source']),
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
                    $this->csvLabel($row['model']),
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

    private function csvLabel(string $value): string
    {
        return preg_match('/^\s*[=+\-@]|^[\t\r\n]/u', $value) ? "'".$value : $value;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAnalytics(AnalyticsRequest $request, User $actor): array
    {
        $period = $request->string('period')->toString() ?: now('Asia/Jakarta')->format('Y-m');
        $mode = $request->string('mode')->toString() === 'achievement' ? 'achievement' : 'acquisition';
        $window = new ReportingPeriod($period);
        $start = $window->start;
        $end = $window->end;
        $achievement = $mode === 'achievement';
        $inPeriod = fn (Builder $history): Builder => $history
            ->where('created_at', '>=', $start)->where('created_at', '<', $end);

        $query = DealTransaction::query()
            ->visibleInReportsTo($actor)
            ->select(['id', 'public_id', 'sales_id', 'vehicle_model', 'source', 'current_stage', 'created_at'])
            ->with('sales:id,name');
        foreach ([PipelineStage::Spk, PipelineStage::Do, PipelineStage::Delivery] as $stage) {
            $query->withExists(['stageHistories as reached_'.$stage->value => function (Builder $history) use ($stage, $achievement, $inPeriod): void {
                $history->where('to_stage', $stage);
                if ($achievement) {
                    $inPeriod($history);
                }
            }]);
        }

        if ($achievement) {
            $query->whereHas('stageHistories', $inPeriod);
        } else {
            $query->where('created_at', '>=', $start)->where('created_at', '<', $end);
        }

        $deals = $query->get();
        $dimension = $request->string('dimension')->toString();
        $value = $request->string('value')->toString();

        $sourceGroups = $deals->groupBy('source');
        $modelGroups = $deals->groupBy('vehicle_model');
        $totalDeals = max(1, $deals->count());

        $sources = $sourceGroups->map(function (Collection $group, string $source) use ($achievement, $totalDeals): array {
            $counts = $this->stageCounts($group, $achievement);

            return [
                'source' => $source,
                'total' => $group->count(),
                'share' => round(($group->count() / $totalDeals) * 100, 1),
                ...$counts,
                'conversion' => ! $achievement
                    ? round(($counts['delivery'] / max(1, $group->count())) * 100, 1)
                    : null,
            ];
        })->sortByDesc('total')->values()->all();

        $models = $modelGroups->map(function (Collection $group, string $model) use ($achievement, $totalDeals): array {
            return [
                'model' => $model,
                'total' => $group->count(),
                'share' => round(($group->count() / $totalDeals) * 100, 1),
                ...$this->stageCounts($group, $achievement),
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
    private function stageCounts(Collection $deals, bool $achievement): array
    {
        $counts = ['spk' => 0, 'do' => 0, 'delivery' => 0];
        foreach ($deals as $deal) {
            $row = $deal->getAttributes();
            foreach ($counts as $stage => $count) {
                if ($row['reached_'.$stage] || (! $achievement && $row['current_stage'] === $stage)) {
                    $counts[$stage] = $count + 1;
                }
            }
        }

        return $counts;
    }
}
