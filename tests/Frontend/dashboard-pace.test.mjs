import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    monthPace,
    rankByPace,
} from '../../resources/js/lib/dashboard-charts.ts';

// Monday 23 Nov 2026, 10:00 WIB.
const monday = new Date('2026-11-23T03:00:00Z');
const sunday = new Date('2026-11-29T03:00:00Z');
const nov = { elapsed: 19, total: 25 };

test('behind and on pace count today among the remaining workdays', () => {
    const behind = monthPace(8, 3, nov, '2026-11-01', monday);
    assert.equal(behind.status, 'behind');
    assert.equal(behind.remainingDays, 7);
    assert.equal(behind.remainingUnits, 5);
    assert.equal(behind.needed, 5 / 7);
    assert.equal(behind.current, 3 / 19);
    assert.equal(monthPace(8, 7, nov, '2026-11-01', monday).status, 'on');
    // 5/19 per day against 3/7 needed: behind, but by less than three times.
    assert.equal(monthPace(8, 5, nov, '2026-11-01', monday).status, 'slipping');
    assert.equal(monthPace(8, 0, nov, '2026-11-01', monday).status, 'behind');
});

test('Sunday is not a remaining workday', () => {
    assert.equal(
        monthPace(8, 3, { elapsed: 24, total: 25 }, '2026-11-01', sunday)
            .remainingDays,
        1,
    );
});

test('reached, missing target and finished periods skip the rate', () => {
    const reached = monthPace(8, 9, nov, '2026-11-01', monday);
    assert.equal(reached.status, 'reached');
    assert.equal(reached.summary, '9 dari 8 unit (+1)');
    assert.equal(reached.needed, null);
    assert.equal(monthPace(null, 3, nov, '2026-11-01', monday).status, 'none');
    assert.equal(monthPace(0, 3, nov, '2026-11-01', monday).status, 'none');
    const over = monthPace(
        8,
        6,
        { elapsed: 27, total: 27 },
        '2026-10-01',
        monday,
    );
    assert.equal(over.status, 'over');
    assert.equal(over.summary, '6 dari 8 unit (kurang 2)');
});

test('coaching order puts the furthest behind first', () => {
    const rows = [
        {
            name: 'Dewi',
            realization_units: 9,
            forecast_units: null,
            target_units: 8,
        },
        {
            name: 'Rina',
            realization_units: 2,
            forecast_units: null,
            target_units: null,
        },
        {
            name: 'Andi',
            realization_units: 7,
            forecast_units: null,
            target_units: 8,
        },
        {
            name: 'Sari',
            realization_units: 4,
            forecast_units: null,
            target_units: 8,
        },
        {
            name: 'Budi',
            realization_units: 1,
            forecast_units: null,
            target_units: 8,
        },
    ];
    const ranked = rankByPace(rows, (r) =>
        monthPace(
            r.target_units,
            r.realization_units,
            nov,
            '2026-11-01',
            monday,
        ),
    );
    assert.deepEqual(
        ranked.map((r) => r.name),
        ['Budi', 'Sari', 'Andi', 'Dewi', 'Rina'],
    );
});
