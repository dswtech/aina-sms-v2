<?php

use App\Support\Releases;
use PHPUnit\Framework\ExpectationFailedException;

function checkRelease(array $release): void
{
    expect($release['version'])->toMatch('/^\d+\.\d+\.\d+$/')
        ->and($release['date'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
    [$year, $month, $day] = array_map('intval', explode('-', $release['date']));
    expect(checkdate($month, $day, $year))->toBeTrue()
        ->and($release['items'])->not->toBeEmpty();
    foreach ($release['items'] as $item) {
        expect(trim($item))->not->toBe('');
    }
    if ($release['notify']) {
        expect(trim($release['summary']))->not->toBe('');
    }
    foreach ([$release['summary'], ...$release['items']] as $text) {
        expect($text)->not->toMatch('/#\d+|migration|migrasi|in-app|\bPR\b/i');
    }
}

/** @param  list<array{version: string}>  $releases */
function checkOrder(array $releases): void
{
    for ($i = 1; $i < count($releases); $i++) {
        expect(version_compare($releases[$i - 1]['version'], $releases[$i]['version']))->toBe(1);
    }
}

function sampleRelease(array $override = []): array
{
    return [...['version' => '1.4.0', 'date' => '2026-11-20', 'notify' => true, 'summary' => 'Ringkasan.', 'items' => ['Satu poin.']], ...$override];
}

it('accepts every shipped entry and their order', function () {
    foreach (Releases::all() as $release) {
        checkRelease($release);
    }
    checkOrder(Releases::all());
});

it('rejects badly written entries', function (array $override) {
    expect(fn () => checkRelease(sampleRelease($override)))->toThrow(ExpectationFailedException::class);
})->with([
    'blank summary' => [['summary' => ' ']],
    'impossible month' => [['date' => '2026-13-01']],
    'impossible day' => [['date' => '2026-02-30']],
    'no items' => [['items' => []]],
    'blank item' => [['items' => [' ']]],
    'bad version' => [['version' => 'v1.4.0']],
    'pull request number' => [['items' => ['Perbaikan (#126).']]],
    'indonesian migration' => [['items' => ['Ada migrasi database.']]],
    'in-app wording' => [['items' => ['Notifikasi in-app baru.']]],
]);

it('rejects duplicate or ascending versions', function (array $versions) {
    $releases = array_map(fn (string $v): array => sampleRelease(['version' => $v]), $versions);
    expect(fn () => checkOrder($releases))->toThrow(ExpectationFailedException::class);
})->with([
    'duplicate' => [['1.3.0', '1.3.0']],
    'ascending' => [['1.3.0', '1.4.0']],
]);

it('exposes the first entry as the current release', function () {
    expect(Releases::current()['version'])->toBe(Releases::all()[0]['version']);
});
