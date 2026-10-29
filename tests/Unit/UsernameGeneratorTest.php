<?php

use App\Support\UsernameGenerator;

it('builds a memorable username from name segments', function (string $name, string $expected) {
    expect(UsernameGenerator::fromName($name))->toBe($expected);
})->with([
    ['Dhany Seskoadi Wibawa', 'dhaseswib'],
    ['Bima Pratama', 'bimaprat'],
    ['Ariina', 'ariina'],
]);
