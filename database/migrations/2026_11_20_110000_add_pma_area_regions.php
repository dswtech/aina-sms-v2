<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const REGIONS = ['32.14', '32.03', '32.13'];

    public function up(): void
    {
        $json = file_get_contents(database_path('data/pma-regions.json'));
        if ($json === false) {
            throw new RuntimeException('PMA area master is missing.');
        }
        $master = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        DB::table('area_regions')->insertOrIgnore($master['regions']);
        DB::table('area_districts')->insertOrIgnore($master['districts']);
    }

    public function down(): void
    {
        // Restrict foreign keys refuse this once a customer or transaction uses one of these districts.
        DB::table('area_districts')->whereIn('region_code', self::REGIONS)->delete();
        DB::table('area_regions')->whereIn('code', self::REGIONS)->delete();
    }
};
