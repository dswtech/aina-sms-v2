<?php

use App\Support\PhoneNormalizer;

it('normalizes Indonesian phone numbers to E.164 format', function (string $input, ?string $expected) {
    expect(PhoneNormalizer::normalize($input))->toBe($expected);
})->with([
    'standard mobile with 08' => ['08123456789', '+628123456789'],
    'standard mobile with spaces and dashes' => ['0812-3456-7890', '+6281234567890'],
    'standard mobile with parentheses' => ['(0812) 3456 789', '+628123456789'],
    'international format with 628' => ['6281234567890', '+6281234567890'],
    'international format with plus' => ['+6281234567890', '+6281234567890'],
    'formatted international' => ['+62 812-3456-7890', '+6281234567890'],
    'invalid too short' => ['0812', null],
    'invalid letters' => ['0812abc3456', null],
    'invalid empty string' => ['', null],
]);

it('validates whether a phone number is valid', function (string $input, bool $isValid) {
    expect(PhoneNormalizer::isValid($input))->toBe($isValid);
})->with([
    'valid 0812...' => ['08123456789', true],
    'valid +628...' => ['+628123456789', true],
    'invalid short' => ['12345', false],
    'invalid blank' => ['', false],
]);
