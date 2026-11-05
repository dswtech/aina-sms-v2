<?php

namespace App\Support;

class TargetUnits
{
    public static function scaled(int|float|string $value): int
    {
        // Validation at the request boundary guarantees nonnegative, finite decimals.
        [$whole, $fraction] = array_pad(explode('.', (string) $value, 2), 2, '');

        return (int) $whole * 10000 + (int) str_pad($fraction, 4, '0');
    }

    public static function number(int $scaled): int|float
    {
        return $scaled % 10000 === 0 ? intdiv($scaled, 10000) : $scaled / 10000;
    }

    public static function benchmark(int $base, int $markup): int
    {
        return intdiv($base * (1000000 + $markup) + 999999, 1000000);
    }
}
