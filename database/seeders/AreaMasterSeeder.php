<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Official Bandung Raya regions/districts. Idempotent: refreshes names, never deletes referenced codes.
 */
class AreaMasterSeeder extends Seeder
{
    public function run(): void
    {
        $master = json_decode((string) file_get_contents(database_path('data/bandung-raya.json')), true, flags: JSON_THROW_ON_ERROR);
        DB::table('area_regions')->upsert($master['regions'], ['code'], ['name']);
        DB::table('area_districts')->upsert($master['districts'], ['code'], ['region_code', 'name']);
    }
}
