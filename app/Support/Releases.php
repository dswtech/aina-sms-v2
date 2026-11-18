<?php

namespace App\Support;

/**
 * Release history from config/releases.php, newest first.
 *
 * @phpstan-type Release array{version: string, date: string, notify: bool, summary: string, items: list<string>}
 */
final class Releases
{
    /** @return list<Release> */
    public static function all(): array
    {
        return config('releases');
    }

    /** @return Release */
    public static function current(): array
    {
        return self::all()[0];
    }
}
