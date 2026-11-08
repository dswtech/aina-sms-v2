import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    monthRangeError,
    formatMonthRange,
} from '../../resources/js/lib/month-range.ts';
import {
    initialLeasing,
    syntheticDeals,
    summarizeFinancing,
} from '../../resources/js/lib/financing-preview.ts';

test('month ranges validate required dates, calendar months and order', () => {
    assert.equal(monthRangeError('2026-10', '2026-11'), null);
    assert.equal(monthRangeError('2026-11', '2026-11'), null);
    for (const [from, to] of [
        ['', '2026-11'],
        ['2026-13', '2026-11'],
        ['2026-11', '2026-10'],
        ['10000-01', '10000-02'],
    ])
        assert.equal(typeof monthRangeError(from, to), 'string');
    assert.equal(formatMonthRange('2026-11', '2026-11'), 'November 2026');
    assert.equal(
        formatMonthRange('2026-10', '2026-11'),
        'Oktober 2026 – November 2026',
    );
});

test('synthetic multi-month totals include each transaction once in the chosen cohort', () => {
    const result = summarizeFinancing(
        syntheticDeals,
        initialLeasing,
        '2026-10',
        'prospect',
        '2026-11',
    );
    assert.equal(result.total, 160);
    assert.equal(result.cash + result.credit + result.unknown, result.total);
    assert.equal(
        result.leasing.reduce((sum, row) => sum + row.count, 0),
        result.credit,
    );
    assert.equal(
        summarizeFinancing(
            syntheticDeals,
            initialLeasing,
            '2026-10',
            'do',
            '2026-11',
        ).total,
        summarizeFinancing(syntheticDeals, initialLeasing, '2026-11', 'do')
            .total,
    );
    assert.equal(
        summarizeFinancing(
            syntheticDeals,
            initialLeasing,
            '2026-12',
            'prospect',
            '2026-10',
        ).total,
        0,
    );
});
