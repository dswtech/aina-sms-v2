<?php

namespace App\Support;

use Carbon\CarbonImmutable;

final readonly class ReportingPeriod
{
    /** A range loads every row in it into memory, so it stays bounded. */
    public const MAX_MONTHS = 24;

    /** Validation rule for the end month; $startKey is the request key holding the start month. */
    public static function maxRangeRule(string $startKey): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($startKey): void {
            $start = request()->input($startKey);
            // date_format reports malformed months; this rule only measures valid ones.
            if (! is_string($start) || ! is_string($value) || ! preg_match('/^\d{4}-\d{2}$/', $start) || ! preg_match('/^\d{4}-\d{2}$/', $value)) {
                return;
            }
            [$y1, $m1] = array_map('intval', explode('-', $start));
            [$y2, $m2] = array_map('intval', explode('-', $value));
            if (($y2 - $y1) * 12 + ($m2 - $m1) + 1 > self::MAX_MONTHS) {
                $fail('Rentang maksimal '.self::MAX_MONTHS.' bulan.');
            }
        };
    }

    public CarbonImmutable $start;

    public CarbonImmutable $end;

    public function __construct(string $month, ?string $until = null)
    {
        $local = CarbonImmutable::createFromFormat('!Y-m', $month, 'Asia/Jakarta');
        $this->start = $local->utc();
        $this->end = CarbonImmutable::createFromFormat('!Y-m', $until ?? $month, 'Asia/Jakarta')->addMonth()->utc();
    }
}
