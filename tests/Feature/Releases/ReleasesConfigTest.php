<?php

use App\Support\Releases;

it('has a well formed version and date on every entry', function () {
    foreach (Releases::all() as $release) {
        expect($release['version'])->toMatch('/^\d+\.\d+\.\d+$/')
            ->and($release['date'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
    }
});

it('orders versions strictly from newest to oldest', function () {
    $versions = array_column(Releases::all(), 'version');

    for ($i = 1; $i < count($versions); $i++) {
        expect(version_compare($versions[$i - 1], $versions[$i]))->toBe(1);
    }
});

it('gives every entry at least one non-empty item', function () {
    foreach (Releases::all() as $release) {
        expect($release['items'])->not->toBeEmpty();
        foreach ($release['items'] as $item) {
            expect($item)->toBeString()->not->toBe('');
        }
    }
});

it('requires a summary when the entry notifies users', function () {
    foreach (Releases::all() as $release) {
        if ($release['notify']) {
            expect($release['summary'])->not->toBe('');
        }
    }
});

it('keeps technical terms out of user facing text', function () {
    foreach (Releases::all() as $release) {
        foreach ([$release['summary'], ...$release['items']] as $text) {
            expect($text)->not->toMatch('/#\d+|migration|\bPR\b/i');
        }
    }
});

it('exposes the first entry as the current release', function () {
    expect(Releases::current()['version'])->toBe(Releases::all()[0]['version']);
});
