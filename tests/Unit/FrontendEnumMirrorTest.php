<?php

use App\Enums\InsuranceType;
use App\Enums\Occupation;
use App\Enums\VehicleOwnership;

// customer-profile.ts mirrors these enums by hand (node --test runs it without app props).
it('keeps the frontend option lists in sync with their enums', function (string $list, string $enum) {
    $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/lib/customer-profile.ts');
    preg_match('/export const '.$list.' = \[(.*?)\];/s', $source, $block);
    preg_match_all("/\{ value: '([^']+)', label: '([^']+)' \}/", $block[1] ?? '', $pairs, PREG_SET_ORDER);

    expect(array_map(fn (array $p) => [$p[1], $p[2]], $pairs))
        ->toBe(array_map(fn ($case) => [$case->value, $case->label()], $enum::cases()));
})->with([
    'occupations' => ['OCCUPATIONS', Occupation::class],
    'insurances' => ['INSURANCES', InsuranceType::class],
    'ownerships' => ['OWNERSHIPS', VehicleOwnership::class],
]);
