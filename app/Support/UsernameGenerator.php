<?php

namespace App\Support;

use Closure;
use InvalidArgumentException;

/**
 * Pure username candidate generator: it never reads the database. The caller injects
 * randomness and the collision check, so tests can fix the seed and fake collisions.
 */
final class UsernameGenerator
{
    public const MIN_LENGTH = 6;

    /** Matches the users.username and invitations.username column width. */
    public const MAX_LENGTH = 12;

    public const MAX_ATTEMPTS = 50;

    /** Rejected when contained anywhere in a candidate, so digits or prefixes cannot disguise them. */
    public const BANNED = [
        'administrator', 'superadmin', 'support', 'security', 'system', 'sysadmin',
        'postmaster', 'hostmaster', 'webmaster', 'noreply', 'anonymous', 'undefined',
        'aiia', 'aina', 'dealdrive', 'toyota',
    ];

    /** @param  Closure(string): bool  $exists */
    public function __construct(private readonly Rand $rand, private readonly Closure $exists) {}

    /**
     * @throws InvalidArgumentException when the name has no Latin letters.
     * @throws UsernameExhausted when every attempt is banned or taken.
     */
    public function generate(string $name): string
    {
        $words = self::words($name);
        if ($words === []) {
            throw new InvalidArgumentException('The name has no Latin letters.');
        }

        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $candidate = $this->candidate($words, $attempt);
            if (! self::isBanned($candidate) && ! ($this->exists)($candidate)) {
                return $candidate;
            }
        }

        throw new UsernameExhausted;
    }

    /** @return list<string> */
    public static function words(string $name): array
    {
        $letters = preg_replace('/[^a-z ]/', '', mb_strtolower($name));

        return preg_split('/ +/', (string) $letters, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    }

    public static function isBanned(string $candidate): bool
    {
        foreach (self::BANNED as $word) {
            if (str_contains($candidate, $word)) {
                return true;
            }
        }

        return false;
    }

    /** @param  list<string>  $words  always the full name, so attempts never build on each other */
    private function candidate(array $words, int $attempt): string
    {
        for ($i = count($words) - 1; $i > 0; $i--) {
            $j = $this->rand->intN($i + 1);
            [$words[$i], $words[$j]] = [$words[$j], $words[$i]];
        }

        $letters = '';
        foreach (array_slice($words, 0, 2) as $word) {
            $length = strlen($word);
            $letters .= substr($word, 0, $length <= 2 ? $length : 2 + $this->rand->intN($length - 1));
        }

        $digits = $attempt === 0 ? '' : $this->digits(2);
        $candidate = substr($letters, 0, self::MAX_LENGTH - strlen($digits)).$digits;

        return $candidate.$this->digits(max(0, self::MIN_LENGTH - strlen($candidate)));
    }

    private function digits(int $count): string
    {
        $digits = '';
        for ($i = 0; $i < $count; $i++) {
            $digits .= $this->rand->intN(10);
        }

        return $digits;
    }
}
