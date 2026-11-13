<?php

namespace App\Support;

use Random\Randomizer;

final class RandomizerRand implements Rand
{
    /** The default engine is CSPRNG; tests pass a seeded Mt19937 engine. */
    public function __construct(private readonly Randomizer $randomizer = new Randomizer) {}

    public function intN(int $n): int
    {
        return $this->randomizer->getInt(0, $n - 1);
    }
}
