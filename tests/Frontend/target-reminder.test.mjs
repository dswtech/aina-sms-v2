import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    dismiss,
    isDismissed,
    reminderMessage,
} from '../../resources/js/lib/target-reminder.ts';

const memory = () => {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
};
const blocked = {
    getItem() {
        throw new Error('blocked');
    },
    setItem() {
        throw new Error('blocked');
    },
};

test('a dismissal lasts one day and belongs to one user', () => {
    const storage = memory();
    assert.equal(isDismissed(storage, 'a', '2026-11-24'), false);
    dismiss(storage, 'a', '2026-11-24');
    assert.equal(isDismissed(storage, 'a', '2026-11-24'), true);
    assert.equal(isDismissed(storage, 'a', '2026-11-25'), false);
    assert.equal(isDismissed(storage, 'b', '2026-11-24'), false);
});

test('blocked storage still dismisses for this session without throwing', () => {
    assert.equal(isDismissed(blocked, 'c', '2026-11-24'), false);
    assert.doesNotThrow(() => dismiss(blocked, 'c', '2026-11-24'));
    assert.equal(isDismissed(blocked, 'c', '2026-11-24'), true);
    assert.equal(isDismissed(blocked, 'd', '2026-11-24'), false);
});

test('the message names each team and what is missing', () => {
    const missing = {
        id: '1',
        name: 'Tim A',
        reason: 'missing_target',
        unallocated_count: 0,
    };
    const unallocated = { ...missing, reason: 'unallocated_sales' };
    assert.equal(
        reminderMessage([missing]),
        'Target Tim A bulan ini belum diisi.',
    );
    assert.equal(
        reminderMessage([
            { ...unallocated, name: 'Tim B', unallocated_count: 2 },
        ]),
        '2 Sales di Tim B belum mendapat target bulan ini.',
    );
    assert.equal(
        reminderMessage([
            missing,
            { ...unallocated, name: 'Tim B', unallocated_count: 2 },
        ]),
        'Target Tim A bulan ini belum diisi. 2 Sales di Tim B belum mendapat target bulan ini.',
    );
});
