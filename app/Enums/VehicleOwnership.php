<?php

namespace App\Enums;

enum VehicleOwnership: string
{
    case FirstBuyer = 'first_buyer';
    case Additional = 'additional';
    case TradeIn = 'trade_in';

    public function label(): string
    {
        return match ($this) {
            self::FirstBuyer => 'First Buyer',
            self::Additional => 'Additional',
            self::TradeIn => 'Trade In',
        };
    }
}
