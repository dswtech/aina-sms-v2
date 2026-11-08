<?php

namespace App\Support;

use Carbon\CarbonImmutable;

final readonly class ReportingPeriod
{
    public CarbonImmutable $start;

    public CarbonImmutable $end;

    public function __construct(string $month, ?string $until = null)
    {
        $local = CarbonImmutable::createFromFormat('!Y-m', $month, 'Asia/Jakarta');
        $this->start = $local->utc();
        $this->end = CarbonImmutable::createFromFormat('!Y-m', $until ?? $month, 'Asia/Jakarta')->addMonth()->utc();
    }
}
