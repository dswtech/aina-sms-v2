import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatRelativeTime,
    kindLabel,
} from '../../resources/js/lib/notifications.ts';

const now = Date.parse('2026-11-18T10:00:00Z');

test('relative time handles empty, invalid and recent values', () => {
    assert.equal(formatRelativeTime(null, now), '');
    assert.equal(formatRelativeTime('bukan tanggal', now), '');
    assert.equal(formatRelativeTime('2026-11-18T09:59:40Z', now), 'Baru saja');
    assert.match(formatRelativeTime('2026-11-18T08:00:00Z', now), /2 jam/);
    assert.match(formatRelativeTime('2026-11-15T10:00:00Z', now), /3 hari/);
});

test('kind label falls back to coaching comment for unknown or missing kinds', () => {
    assert.equal(kindLabel('stage_changed'), 'Perubahan tahap');
    assert.equal(kindLabel('stagnant'), 'Stagnan');
    assert.equal(kindLabel('stagnant_summary'), 'Stagnan');
    assert.equal(kindLabel(undefined), 'Komentar coaching');
    assert.equal(kindLabel('aneh'), 'Komentar coaching');
});
