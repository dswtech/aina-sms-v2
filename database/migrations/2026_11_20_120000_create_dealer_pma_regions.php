<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Owner default on 2026-11-20; literal so later class changes never alter this migration. */
    private const DEFAULT_PMA = ['32.73', '32.04', '32.17', '32.77', '32.14', '32.03', '32.13'];

    public function up(): void
    {
        Schema::create('dealer_pma_regions', function (Blueprint $table): void {
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->string('region_code', 16);
            $table->foreign('region_code')->references('code')->on('area_regions')->restrictOnDelete();
            $table->primary(['dealer_id', 'region_code']);
        });
        foreach (DB::table('dealers')->pluck('id') as $dealerId) {
            DB::table('dealer_pma_regions')->insertOrIgnore(array_map(
                fn (string $code): array => ['dealer_id' => $dealerId, 'region_code' => $code],
                self::DEFAULT_PMA,
            ));
        }
        $this->backfill();
    }

    /** Earlier DO snapshots get is_pma from their recorded region against the default list; never overwritten. */
    public function backfill(): void
    {
        DB::table('stage_histories')->whereNotNull('area_snapshot')->orderBy('id')->chunkById(500, function ($rows): void {
            foreach ($rows as $row) {
                $area = json_decode($row->area_snapshot, true);
                if (! is_array($area) || array_key_exists('is_pma', $area)) {
                    continue;
                }
                $area['is_pma'] = in_array($area['region_code'] ?? null, self::DEFAULT_PMA, true);
                DB::table('stage_histories')->where('id', $row->id)->update(['area_snapshot' => json_encode($area)]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_pma_regions');
    }
};
