<?php

it('keeps local and CI runtime requirements aligned', function () {
    $root = dirname(__DIR__, 2);
    $composer = json_decode(
        file_get_contents($root.'/composer.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );
    $workflow = file_get_contents($root.'/.github/workflows/tests.yml');

    expect($composer['require']['php'])->toBe('^8.4.1')
        ->and(trim(file_get_contents($root.'/.nvmrc')))->toBe('24')
        ->and($workflow)->toContain("php-version: '8.4'")
        ->and($workflow)->toContain("node-version-file: '.nvmrc'")
        ->not->toContain("node-version: '22'");
});
