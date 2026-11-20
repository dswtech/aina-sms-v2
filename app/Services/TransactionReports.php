<?php

namespace App\Services;

use App\Enums\PipelineStage;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use App\Support\ReportingPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/** Server-side aggregates for the financing and Mapping Area reports; no customer data leaves here. */
final class TransactionReports
{
    /**
     * Prospect: first entry into Prospect inside the range, deal counted once, current financing.
     * DO: valid (non-reversed) DO events inside the range, financing frozen in the DO snapshot.
     *
     * @return array<string, mixed>
     */
    public function financing(User $actor, string $from, string $to, string $mode): array
    {
        [$start, $end] = $this->window($from, $to);
        $leasings = DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->get()->keyBy('id');

        if ($mode === 'do') {
            $rows = $this->realizedDo($actor, $start, $end)->get(['financing_snapshot'])->map(function (StageHistory $h): array {
                $snapshot = $h->financing_snapshot ?? [];

                return [$snapshot['type'] ?? null, $snapshot['leasing_id'] ?? null, $snapshot['leasing_name'] ?? null,
                    (bool) ($snapshot['is_monitored'] ?? false), isset($snapshot['leasing_id'])];
            });
        } else {
            $firstProspect = DB::table('stage_histories')->selectRaw('deal_transaction_id, min(created_at) as first_at')
                ->where('to_stage', PipelineStage::Prospect->value)->groupBy('deal_transaction_id');
            $rows = DealTransaction::query()->visibleInReportsTo($actor)
                ->joinSub($firstProspect, 'fp', 'fp.deal_transaction_id', '=', 'deal_transactions.id')
                ->where('fp.first_at', '>=', $start)->where('fp.first_at', '<', $end)
                ->get(['financing_type', 'leasing_id', 'financing_other_name'])
                ->map(function (DealTransaction $d) use ($leasings): array {
                    $master = $d->leasing_id !== null ? $leasings->get($d->leasing_id) : null;

                    return [$d->financing_type, $d->leasing_id, $master->name ?? $d->financing_other_name,
                        (bool) ($master->is_monitored ?? false), $d->leasing_id !== null];
                });
            // Monitored active leasing always gets a bar so zero is visible.
        }

        $groups = [];
        if ($mode === 'prospect') {
            foreach ($leasings->where('is_active', true)->where('is_monitored', true) as $l) {
                $groups[(string) $l->id] = ['id' => (string) $l->id, 'name' => $l->name, 'count' => 0];
            }
        }
        $cash = $credit = $unknown = 0;
        foreach ($rows as [$type, $leasingId, $name, $monitored, $hasMaster]) {
            if ($type === 'cash') {
                $cash++;

                continue;
            }
            if ($type !== 'credit') {
                $unknown++;

                continue;
            }
            $credit++;
            $id = ($leasingId === null && ($name === null || $name === '')) ? 'unselected'
                : ($hasMaster && $monitored ? (string) $leasingId : 'other');
            $label = ['unselected' => 'Leasing belum dipilih', 'other' => 'Kredit Lain'][$id] ?? ($name ?? 'Leasing');
            $groups[$id] ??= ['id' => $id, 'name' => $label, 'count' => 0];
            $groups[$id]['count']++;
        }
        foreach (['other' => 'Kredit Lain', 'unselected' => 'Leasing belum dipilih'] as $id => $label) {
            $groups[$id] ??= ['id' => $id, 'name' => $label, 'count' => 0];
        }
        $trailing = fn (string $id): int => ['other' => 1, 'unselected' => 2][$id] ?? 0;
        uasort($groups, fn (array $a, array $b): int => [$trailing($a['id']), -$a['count'], mb_strtolower($a['name'])]
            <=> [$trailing($b['id']), -$b['count'], mb_strtolower($b['name'])]);

        return ['from' => $from, 'to' => $to, 'mode' => $mode, 'total' => $rows->count(), 'cash' => $cash, 'credit' => $credit,
            'unknown' => $unknown, 'leasing' => array_values($groups)];
    }

    /**
     * Groups come from the DO snapshot (FOA first, then PMA, then outside). The zero rows listed
     * for FOA districts and PMA regions follow the dealer's current settings.
     *
     * @return array<string, mixed>
     */
    public function mappingArea(User $actor, string $from, string $to): array
    {
        [$start, $end] = $this->window($from, $to);
        $foaCodes = DB::table('dealer_foa_districts')->where('dealer_id', $actor->dealer_id)->pluck('district_code')->all();
        $pmaCodes = DB::table('dealer_pma_regions')->where('dealer_id', $actor->dealer_id)->pluck('region_code')->all();
        $regionNames = DB::table('area_regions')->pluck('name', 'code');
        $months = [];
        for ($month = CarbonImmutable::createFromFormat('!Y-m', $from); $month->format('Y-m') <= $to; $month = $month->addMonth()) {
            $months[$month->format('Y-m')] = ['month' => $month->format('Y-m'), 'total' => 0, 'foa' => 0, 'pma' => 0];
        }
        $districts = [];
        foreach (DB::table('area_districts')->whereIn('code', $foaCodes)->get() as $d) {
            $districts[$d->code] = ['id' => $d->code, 'name' => $d->name, 'regionName' => $regionNames[$d->region_code] ?? '', 'count' => 0];
        }
        $regions = [];
        foreach ($pmaCodes as $code) {
            $regions[$code] = ['id' => $code, 'name' => $regionNames[$code] ?? $code, 'isPma' => true, 'count' => 0];
        }
        $foa = $pmaOutsideFoa = $outsidePma = $unverified = 0;
        foreach ($this->realizedDo($actor, $start, $end)->get(['area_snapshot', 'created_at']) as $history) {
            $area = $history->area_snapshot;
            if ($area === null) {
                $unverified++; // legacy DO without snapshot: surfaced, never guessed into an area

                continue;
            }
            $isFoa = (bool) ($area['is_foa'] ?? false);
            $isPma = (bool) ($area['is_pma'] ?? false);
            $isFoa ? $foa++ : ($isPma ? $pmaOutsideFoa++ : $outsidePma++);
            $month = &$months[$history->created_at->setTimezone('Asia/Jakarta')->format('Y-m')];
            $month['total']++;
            $month['foa'] += (int) $isFoa;
            $month['pma'] += (int) ($isFoa || $isPma);
            unset($month);

            $district = $isFoa ? (string) $area['district_code'] : 'other';
            $districts[$district] ??= $isFoa
                ? ['id' => $district, 'name' => (string) $area['district_name'], 'regionName' => (string) $area['region_name'], 'count' => 0]
                : ['id' => 'other', 'name' => 'Kecamatan lain', 'regionName' => '', 'count' => 0];
            $districts[$district]['count']++;

            $region = (string) $area['region_code'];
            $regions[$region] ??= $region === 'other'
                ? ['id' => 'other', 'name' => 'Kota Lain', 'isPma' => false, 'count' => 0]
                : ['id' => $region, 'name' => (string) ($area['region_name'] ?? $regionNames[$region] ?? $region), 'isPma' => false, 'count' => 0];
            $regions[$region]['count']++;
        }
        $districts['other'] ??= ['id' => 'other', 'name' => 'Kecamatan lain', 'regionName' => '', 'count' => 0];
        $byCount = fn (array $a, array $b): int => [-$a['count'], mb_strtolower($a['name'])] <=> [-$b['count'], mb_strtolower($b['name'])];
        uasort($districts, fn (array $a, array $b): int => [$a['id'] === 'other'] <=> [$b['id'] === 'other'] ?: $byCount($a, $b));
        uasort($regions, fn (array $a, array $b): int => [$a['id'] === 'other', ! $a['isPma']] <=> [$b['id'] === 'other', ! $b['isPma']] ?: $byCount($a, $b));

        return ['from' => $from, 'to' => $to, 'total' => $foa + $pmaOutsideFoa + $outsidePma, 'foa' => $foa,
            'pmaOutsideFoa' => $pmaOutsideFoa, 'outsidePma' => $outsidePma, 'unverified' => $unverified,
            'districts' => array_values($districts), 'regions' => array_values($regions), 'months' => array_values($months)];
    }

    /** @return Builder<StageHistory> */
    private function realizedDo(User $actor, mixed $start, mixed $end)
    {
        return StageHistory::query()->realizedDo()
            ->whereHas('dealTransaction', fn ($q) => $q->visibleInReportsTo($actor))
            ->where('created_at', '>=', $start)->where('created_at', '<', $end);
    }

    /** @return array{0: mixed, 1: mixed} */
    private function window(string $from, string $to): array
    {
        return [(new ReportingPeriod($from))->start, (new ReportingPeriod($to))->end];
    }
}
