import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatReleaseDate } from '../../resources/js/lib/releases.ts';

test('release dates are shown as day, long Indonesian month and year', () => {
    assert.equal(formatReleaseDate('2026-11-18'), '18 November 2026');
    assert.equal(formatReleaseDate('2026-01-05'), '5 Januari 2026');
});
