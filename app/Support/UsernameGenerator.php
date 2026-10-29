<?php

namespace App\Support;

use Illuminate\Support\Str;

final class UsernameGenerator
{
    public static function fromName(string $name): string
    {
        $normalized = Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9\s]+/', ' ')
            ->squish();

        $parts = $normalized->explode(' ')->filter()->values();

        if ($parts->count() === 1) {
            return Str::limit((string) $parts->first(), 12, '');
        }

        $chunkLength = $parts->count() === 2 ? 4 : 3;

        return Str::limit($parts
            ->map(fn (string $part): string => Str::substr($part, 0, $chunkLength))
            ->implode(''), 12, '');
    }
}
