<?php

namespace App\Support;

interface Rand
{
    /** Return a uniformly random integer in [0, $n). */
    public function intN(int $n): int;
}
