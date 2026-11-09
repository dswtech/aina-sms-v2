import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeDateRange } from '../../resources/js/lib/date-range.ts';

test('end date is never before start date', () => {
    assert.deepEqual(normalizeDateRange('2026-11-01', '2026-11-09'), [
        '2026-11-01',
        '2026-11-09',
    ]);
    assert.deepEqual(normalizeDateRange('2026-11-10', '2026-11-09'), [
        '2026-11-10',
        '2026-11-10',
    ]);
    assert.deepEqual(normalizeDateRange('2026-11-10', ''), ['2026-11-10', '']);
    assert.deepEqual(normalizeDateRange('', '2026-11-09'), ['', '2026-11-09']);
});
