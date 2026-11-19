<?php

namespace App\Services;

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Support\ReportingPeriod;

class StageAchievements
{
    private const STAGES = [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect, PipelineStage::Spk, PipelineStage::Do, PipelineStage::Delivery];

    /** @return array{stages: list<string>, rows: list<array{id: int, name: string, counts: array<string, int>}>, totals: array<string, int>} */
    public function bySales(User $actor, ReportingPeriod $window): array
    {
        $keys = array_map(fn (PipelineStage $stage): string => $stage->value, self::STAGES);
        $empty = array_fill_keys($keys, 0);
        $counts = [];
        foreach (self::STAGES as $stage) {
            DealTransaction::query()->visibleInReportsTo($actor)->reachedStage($stage, $window->start, $window->end)
                ->selectRaw('sales_id, count(*) as total')->groupBy('sales_id')->pluck('total', 'sales_id')
                ->each(function (int $total, int $salesId) use (&$counts, $empty, $stage): void {
                    $counts[$salesId] ??= $empty;
                    $counts[$salesId][$stage->value] = $total;
                });
        }
        // Same Sales scope as TeamPerformance::build.
        $users = User::query()->where('dealer_id', $actor->dealer_id)->where('role', UserRole::Sales)->where('is_active', true);
        if ($actor->role === UserRole::Supervisor) {
            $users->whereIn('id', TeamMembership::query()->whereIn('team_id', Team::query()->visibleTo($actor)->select('id'))
                ->whereNull('ended_at')->where('role', UserRole::Sales)->select('user_id'));
        }
        $rows = User::query()->whereIn('id', array_keys($counts))->orWhereIn('id', $users->select('id'))->orderBy('name')->get(['id', 'name'])
            ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name, 'counts' => $counts[$user->id] ?? $empty])->all();
        $totals = $empty;
        foreach ($rows as $row) {
            foreach ($keys as $key) {
                $totals[$key] += $row['counts'][$key];
            }
        }

        return ['stages' => $keys, 'rows' => $rows, 'totals' => $totals];
    }
}
