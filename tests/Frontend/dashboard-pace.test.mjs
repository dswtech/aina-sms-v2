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
    // 5/19 × 25 projects 82% of 8: slipping; 3 projects 49%: behind.
    assert.equal(monthPace(8, 5, nov, '2026-11-01', monday).status, 'slipping');
    assert.equal(monthPace(8, 0, nov, '2026-11-01', monday).status, 'behind');
    assert.ok(Math.abs(behind.projected - ((3 / 19) * 25) / 8) < 1e-9);
    // Below "seharusnya" (80) is never on pace: today counts once.
    assert.equal(
        monthPace(
            100,
            77,
            { elapsed: 20, total: 25 },
            '2026-11-01',
            new Date('2026-11-24T03:00:00Z'),
        ).status,
        'slipping',
    );
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

test('no realised units ranks below a Sales with a little progress', () => {
    const rows = [
        {
            name: 'Laila',
            realization_units: 2,
            forecast_units: null,
            target_units: 20,
        },
        {
            name: 'Nanda',
            realization_units: 0,
            forecast_units: null,
            target_units: 4,
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
        ['Nanda', 'Laila'],
    );
});

test('the browser fixture covers every tier', () => {
    const tier = (realized, target) =>
        monthPace(target, realized, nov, '2026-11-01', monday).status;
    assert.deepEqual(
        [tier(3, 6), tier(2, 3), tier(3, 3.5), tier(5, 4), tier(0, 0)],
        ['behind', 'slipping', 'on', 'reached', 'none'],
    );
});
