<?php

namespace App\Enums;

enum InsuranceType: string
{
    case Tlo = 'tlo';
    case AllRisk = 'all_risk';
    case Combination = 'combination';

    public function label(): string
    {
        return match ($this) {
            self::Tlo => 'TLO',
            self::AllRisk => 'All Risk',
            self::Combination => 'Kombinasi',
        };
    }
}
