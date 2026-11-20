<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time production patch (owner decision, 2026-11-20): every dealer gets the seven PMA regions and
 * every Kabupaten Bandung Barat district as FOA, and every recorded DO snapshot is recounted against
 * that setting so Mapping Area can be analysed. This deliberately rewrites the FOA/PMA flags of history
 * once; every other snapshot field is left as recorded. Safe to run twice.
 */
return new class extends Migration
{
    /** Literal so later code changes never alter this patch. */
    private const PMA = ['32.73', '32.04', '32.17', '32.77', '32.14', '32.03', '32.13'];

    private const FOA_REGION = '32.17';

    public function up(): void
    {
        $foa = DB::table('area_districts')->where('region_code', self::FOA_REGION)->pluck('code')->all();
        foreach (DB::table('dealers')->pluck('id') as $dealerId) {
            DB::table('dealer_pma_regions')->where('dealer_id', $dealerId)->delete();
            DB::table('dealer_pma_regions')->insert(array_map(fn (string $code): array => ['dealer_id' => $dealerId, 'region_code' => $code], self::PMA));
            DB::table('dealer_foa_districts')->where('dealer_id', $dealerId)->delete();
            DB::table('dealer_foa_districts')->insert(array_map(fn (string $code): array => ['dealer_id' => $dealerId, 'district_code' => $code], $foa));
        }

        // Every dealer now has the same lists, so the flags follow from the recorded codes alone.
        DB::table('stage_histories')->whereNotNull('area_snapshot')->orderBy('id')->chunkById(500, function ($rows) use ($foa): void {
            foreach ($rows as $row) {
                $area = json_decode($row->area_snapshot, true);
                if (! is_array($area)) {
                    continue;
                }
                $area['is_foa'] = in_array($area['district_code'] ?? null, $foa, true);
                $area['is_pma'] = in_array($area['region_code'] ?? null, self::PMA, true);
                DB::table('stage_histories')->where('id', $row->id)->update(['area_snapshot' => json_encode($area)]);
            }
        });
    }

    public function down(): void
    {
        // One-way data correction: the earlier settings and flags are not kept. Restore from the pre-release backup.
    }
};
