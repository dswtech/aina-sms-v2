<?php

use App\Support\Rand;
use App\Support\RandomizerRand;
use App\Support\UsernameExhausted;
use App\Support\UsernameGenerator;
use Random\Engine\Mt19937;
use Random\Randomizer;

function seeded(int $seed = 42): Rand
{
    return new RandomizerRand(new Randomizer(new Mt19937($seed)));
}

/** @param  list<int>  $values */
function scripted(array $values): Rand
{
    return new class($values) implements Rand
    {
        /** @param  list<int>  $values */
        public function __construct(private array $values) {}

        public function intN(int $n): int
        {
            return array_shift($this->values) % $n;
        }
    };
}

function generator(?Rand $rand = null, ?Closure $exists = null): UsernameGenerator
{
    return new UsernameGenerator($rand ?? seeded(), $exists ?? fn (string $candidate): bool => false);
}

it('normalizes names to Latin letter words without transliteration', function (string $name, array $words) {
    expect(UsernameGenerator::words($name))->toBe($words);
})->with([
    'diacritics are dropped' => ['Ñoño Pérez', ['oo', 'prez']],
    'digits and punctuation' => ['Siti2 Rahma-wati!', ['siti', 'rahmawati']],
    'double spaces' => ['  Budi    Santoso  ', ['budi', 'santoso']],
    'no Latin letters' => ['山田 太郎 123', []],
]);

it('rejects a name without Latin letters', function () {
    generator()->generate('山田 太郎 123');
})->throws(InvalidArgumentException::class);

it('joins random prefixes of the first two shuffled words', function () {
    // Shuffle swaps the two words, then takes 5 letters of rahmawati and 2 of siti.
    expect(generator(scripted([0, 3, 0]))->generate('Siti Rahmawati'))->toBe('rahmasi');
});

it('always starts with a letter and stays within 6 to 12 characters', function (string $name) {
    foreach (range(1, 200) as $seed) {
        $attempts = 0;
        $username = generator(seeded($seed), function () use (&$attempts): bool {
            return $attempts++ < 3; // Force later attempts so two-digit suffixes are covered.
        })->generate($name);

        expect($username)->toMatch('/^[a-z][a-z0-9]{5,11}$/');
    }
})->with(['Siti Rahmawati', 'Bartholomew Maximilianus Wijayakusuma', 'Al', 'Ñoño', 'A B C']);

it('pads short candidates with digits up to six characters', function () {
    expect(generator(scripted([0, 1, 2]))->generate('Al Bo'))->toBe('boal12');
});

it('skips candidates containing a banned word', function () {
    $seen = [];
    $username = generator(seeded(7), function (string $candidate) use (&$seen): bool {
        $seen[] = $candidate;

        return false;
    })->generate('Toyota Support');

    expect(UsernameGenerator::isBanned($username))->toBeFalse()
        ->and(UsernameGenerator::isBanned('xtoyota12'))->toBeTrue()
        ->and(UsernameGenerator::isBanned('dealdrive'))->toBeTrue()
        ->and(UsernameGenerator::isBanned('rahmasi'))->toBeFalse();
});

it('adds two digits after the letters once the plain candidate is taken', function () {
    $candidates = [];
    // Attempt 1: rahmawati + siti, cut to 12. Attempt 2: rahma + si, then digits 4 and 2.
    $username = generator(scripted([0, 7, 2, 0, 3, 0, 4, 2]), function (string $candidate) use (&$candidates): bool {
        $candidates[] = $candidate;

        return count($candidates) === 1;
    })->generate('Siti Rahmawati');

    expect($candidates)->toBe(['rahmawatisit', 'rahmasi42'])
        ->and($username)->toBe('rahmasi42');
});

it('starts every attempt from the full name', function () {
    $candidates = [];
    generator(seeded(11), function (string $candidate) use (&$candidates): bool {
        $candidates[] = $candidate;

        return count($candidates) < 30;
    })->generate('Siti Rahmawati');

    foreach ($candidates as $candidate) {
        expect(strlen(rtrim($candidate, '0123456789')))->toBeLessThanOrEqual(10)
            ->and(preg_match('/\d{3,}$/', $candidate))->toBe(0);
    }
});

it('throws UsernameExhausted after 50 rejected attempts', function () {
    $attempts = 0;

    $generator = generator(exists: function () use (&$attempts): bool {
        $attempts++;

        return true;
    });

    expect(fn () => $generator->generate('Siti Rahmawati'))->toThrow(UsernameExhausted::class)
        ->and($attempts)->toBe(UsernameGenerator::MAX_ATTEMPTS);
});

it('is deterministic for a fixed seed', function () {
    $run = fn () => array_map(fn (string $name) => generator(seeded(2026))->generate($name), ['Siti Rahmawati', 'Budi Santoso', 'Ñoño']);

    expect($run())->toBe($run());
});
