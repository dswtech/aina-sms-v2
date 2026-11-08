<?php

namespace App\Services;

use App\Models\Dealer;
use App\Models\DealTransaction;
use Illuminate\Support\Facades\DB;

final class TransactionSnapshots
{
    /** @return array<string, mixed> */
    public static function capture(DealTransaction $deal): array
    {
        // Master mutations acquire this same lock; one DO sees a coherent configuration.
        Dealer::query()->whereKey($deal->dealer_id)->lockForUpdate()->firstOrFail();
        TransactionMetadata::normalize([
            'source' => $deal->source, 'source_channel' => $deal->source_channel,
            'area' => ['region_code' => $deal->region_code, 'district_code' => $deal->district_code, 'other_city' => $deal->other_city],
        ], $deal->dealer_id, requireArea: true);
        $district = DB::table('area_districts')->where('code', $deal->district_code)->first();
        $region = DB::table('area_regions')->where('code', $deal->region_code)->first();
        $leasing = DB::table('leasing_companies')->where('id', $deal->leasing_id)->where('dealer_id', $deal->dealer_id)->first();

        return [
            'area_snapshot' => [
                'region_code' => $deal->region_code, 'region_name' => $region?->name,
                'district_code' => $deal->district_code, 'district_name' => $district?->name,
                'other_city' => $deal->other_city,
                'is_foa' => $district !== null && DB::table('dealer_foa_districts')->where('dealer_id', $deal->dealer_id)->where('district_code', $deal->district_code)->exists(),
            ],
            'financing_snapshot' => [
                'type' => $deal->financing_type, 'leasing_id' => $deal->leasing_id,
                'leasing_name' => $leasing->name ?? $deal->financing_other_name,
                'is_monitored' => (bool) ($leasing->is_monitored ?? false),
            ],
        ];
    }
}
