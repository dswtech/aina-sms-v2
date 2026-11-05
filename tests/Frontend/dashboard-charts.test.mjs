import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    chartMaximum,
    chartWidth,
    rankPerformance,
} from '../../resources/js/lib/dashboard-charts.ts';

test('ranking uses realization then forecast then Indonesian name without mutating rows', () => {
    const rows = [
        { name: 'Zaki', realization_units: 2, forecast_units: 4 },
        { name: 'Budi', realization_units: 3, forecast_units: null },
        { name: 'Ayu', realization_units: 2, forecast_units: 4 },
        { name: 'Dina', realization_units: 2, forecast_units: 5 },
        { name: 'Eka', realization_units: 2, forecast_units: null },
        { name: 'Fajar', realization_units: 2, forecast_units: 0 },
    ];
    assert.deepEqual(
        rankPerformance(rows).map((row) => row.name),
        ['Budi', 'Dina', 'Ayu', 'Zaki', 'Fajar', 'Eka'],
    );
    assert.equal(rows[0].name, 'Zaki');
    assert.deepEqual(rankPerformance([]), []);
});

test('shared chart scale includes targets and overachievement and handles missing or zero data', () => {
    assert.equal(chartMaximum([2, 4.125, 3]), 4.125);
    assert.equal(chartMaximum([0.125, 0.5, null]), 0.5);
    assert.equal(chartMaximum([null, undefined, 0]), 1);
    assert.equal(chartMaximum([]), 1);
    assert.equal(chartWidth(12, chartMaximum([10, 12, 15])), 80);
    assert.equal(chartWidth(15, 15), 100);
    assert.equal(chartWidth(0, 15), 0);
    assert.equal(chartWidth(null, 15), 0);
    assert.equal(chartWidth(0, 0), 0);
});
