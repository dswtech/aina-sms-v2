import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatDay, chatRows, chatTime } from '../../resources/js/lib/coaching.ts';

const comment = (key, at, name, role = 'sales') => ({
    key,
    kind: 'comment',
    occurred_at: at,
    actor_name: name,
    body: key,
    label: 'Komentar',
    comment: { author_role: role },
});

test('days and times follow Jakarta', () => {
    const now = new Date('2026-11-25T03:00:00Z');
    assert.equal(chatDay('2026-11-24T17:00:00Z', now), 'Hari ini');
    assert.equal(chatDay('2026-11-24T16:59:59Z', now), 'Kemarin');
    assert.equal(chatDay('2026-11-22T05:00:00Z', now), '22 Nov 2026');
    assert.equal(chatTime('2026-11-24T17:05:00Z'), '00.05');
});

test('bubbles of one author join only within a day and without an event between', () => {
    const rows = chatRows([
        comment('a', '2026-11-22T05:00:00Z', 'Andi'),
        comment('b', '2026-11-22T05:01:00Z', 'Andi'),
        {
            ...comment('s', '2026-11-22T05:02:00Z', 'Andi'),
            kind: 'stage',
            comment: undefined,
        },
        comment('c', '2026-11-22T05:03:00Z', 'Andi'),
        comment('d', '2026-11-22T17:00:00Z', 'Andi'),
        comment('e', '2026-11-22T17:01:00Z', 'Andi', 'supervisor'),
    ]);
    assert.deepEqual(
        rows.map((row) => row.continues),
        [false, true, false, false, false, false],
    );
    assert.deepEqual(
        rows.map((row) => row.day !== null),
        [true, false, false, false, true, false],
    );
});
