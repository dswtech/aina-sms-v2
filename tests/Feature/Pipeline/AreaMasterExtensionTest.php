<?php

use Illuminate\Support\Facades\DB;

it('adds Purwakarta, Cianjur and Subang with their districts', function () {
    expect(DB::table('area_regions')->whereIn('code', ['32.14', '32.03', '32.13'])->orderBy('name')->pluck('name')->all())
        ->toBe(['Kabupaten Cianjur', 'Kabupaten Purwakarta', 'Kabupaten Subang']);
    $json = json_decode(file_get_contents(database_path('data/pma-regions.json')), true);
    expect(DB::table('area_districts')->whereIn('region_code', ['32.14', '32.03', '32.13'])->count())->toBe(count($json['districts']))
        ->and(count($json['districts']))->toBe(79);
});
