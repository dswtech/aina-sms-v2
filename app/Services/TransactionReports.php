<?php

namespace App\Services;

use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use App\Support\ReportingPeriod;
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
                ->where('to_stage', 'prospect')->groupBy('deal_transaction_id');
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

    /** @return array<string, mixed> */
    public function mappingArea(User $actor, string $from, string $to): array
    {
        [$start, $end] = $this->window($from, $to);
        $groups = [];
        $foa = $other = $unverified = 0;
        foreach ($this->realizedDo($actor, $start, $end)->get(['area_snapshot']) as $history) {
            $area = $history->area_snapshot;
            if ($area === null) {
                $unverified++; // legacy DO without snapshot: surfaced, never guessed into an area

                continue;
            }
            $isFoa = (bool) ($area['is_foa'] ?? false);
            $id = $isFoa ? $area['district_code'] : 'other';
            $groups[$id] ??= $isFoa
                ? ['id' => $id, 'name' => $area['district_name'].' · '.str_replace('Kabupaten', 'Kab.', $area['region_name']),
                    'districtName' => $area['district_name'], 'regionName' => $area['region_name'], 'category' => 'foa', 'count' => 0]
                : ['id' => 'other', 'name' => 'Area lain', 'districtName' => '', 'regionName' => '', 'category' => 'other', 'count' => 0];
            $groups[$id]['count']++;
            $isFoa ? $foa++ : $other++;
        }
        $groups['other'] ??= ['id' => 'other', 'name' => 'Area lain', 'districtName' => '', 'regionName' => '', 'category' => 'other', 'count' => 0];
        uasort($groups, fn (array $a, array $b): int => [$a['id'] === 'other' ? 1 : 0, -$a['count'], mb_strtolower($a['name'])]
            <=> [$b['id'] === 'other' ? 1 : 0, -$b['count'], mb_strtolower($b['name'])]);

        return ['from' => $from, 'to' => $to, 'total' => $foa + $other, 'foa' => $foa, 'other' => $other,
            'unverified' => $unverified, 'rows' => array_values($groups)];
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
