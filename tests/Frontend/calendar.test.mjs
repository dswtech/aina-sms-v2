import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatDay,
    formatMonth,
    hourSlot,
    isOpenPlan,
    isWeekend,
    kindLabel,
    letterOf,
    monthDays,
    shiftDate,
    sortForTooltip,
    summarize,
    weekGrid,
} from '../../resources/js/lib/calendar.ts';

const item = (over = {}) => ({
    id: 'x',
    kind: 'done',
    type: 'visit',
    type_label: 'Kunjungan',
    user_id: 1,
    date: '2026-11-14',
    time: '10:00',
    customer: 'Budi',
    customer_id: 'c-1',
    notes: '',
    overdue: false,
    status: 'completed',
    follow_up_id: null,
    ...over,
});

test('month days and Monday-first week grid', () => {
    assert.equal(monthDays('2026-11-14').length, 30);
    assert.equal(monthDays('2028-02-03').length, 29);
    const nov = weekGrid('2026-11-14');
    // 1 Nov 2026 is a Sunday: the grid starts on Monday 26 Oct and ends Sunday 6 Dec.
    assert.equal(nov[0].date, '2026-10-26');
    assert.equal(nov.at(-1).date, '2026-12-06');
    assert.equal(nov.length % 7, 0);
    assert.equal(nov.filter((cell) => cell.inMonth).length, 30);
    // Feb 2027 starts on Monday and ends on Sunday: exactly four weeks.
    assert.equal(weekGrid('2027-02-10').length, 28);
});

test('weekends, navigation and Indonesian labels', () => {
    assert.equal(isWeekend('2026-11-14'), true);
    assert.equal(isWeekend('2026-11-16'), false);
    assert.equal(shiftDate('2026-01-31', 'month', 1), '2026-02-01');
    assert.equal(shiftDate('2026-01-15', 'month', -1), '2025-12-01');
    assert.equal(shiftDate('2026-12-31', 'day', 1), '2027-01-01');
    assert.equal(formatMonth('2026-11-14'), 'November 2026');
    assert.equal(formatDay('2026-11-14'), 'Sabtu, 14 November 2026');
});

test('hour slots clamp to the visible range', () => {
    assert.deepEqual(hourSlot('06:30'), { hour: 7, edge: true });
    assert.deepEqual(hourSlot('13:00'), { hour: 13, edge: false });
    assert.deepEqual(hourSlot('22:00'), { hour: 21, edge: true });
});

test('cell summaries', () => {
    assert.deepEqual(summarize([item({ type: 'call' })]).label, 'T');
    assert.equal(
        summarize([item({ kind: 'plan', type: 'plan', overdue: true })])
            .variant,
        'late',
    );
    const mix = summarize([
        item(),
        item({ kind: 'plan', type: 'plan', overdue: true }),
        item({ kind: 'plan', type: 'plan' }),
        item(),
        item(),
    ]);
    assert.deepEqual(
        [mix.label, mix.variant, mix.realPercent, mix.lateCount],
        ['5', 'mix', 60, 1],
    );
    assert.equal(summarize(Array.from({ length: 11 }, () => item())).label, '9+');
    assert.equal(
        summarize([item({ kind: 'plan' }), item({ kind: 'plan' })]).variant,
        'plan',
    );
});

test('tooltip lists overdue plans first, then by time', () => {
    const sorted = sortForTooltip([
        item({ id: 'a', time: '08:00' }),
        item({ id: 'b', time: '15:00', overdue: true }),
        item({ id: 'c', time: '07:00' }),
    ]);
    assert.deepEqual(
        sorted.map((i) => i.id),
        ['b', 'c', 'a'],
    );
});

test('completed plans are marked done and are no longer actionable', () => {
    const pending = item({ kind: 'plan', type: 'plan', status: 'pending', follow_up_id: 7 });
    const done = { ...pending, status: 'completed' };
    assert.equal(isOpenPlan(pending), true);
    assert.equal(isOpenPlan(done), false);
    assert.equal(isOpenPlan(item()), false);
    assert.equal(letterOf(done), '✓');
    assert.equal(kindLabel(done), 'Rencana · selesai');
    assert.equal(summarize([done]).variant, 'completed');
});
