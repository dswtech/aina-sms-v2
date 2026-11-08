import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    areaDistricts,
    areaRegions,
} from '../../resources/js/lib/bandung-raya-districts.ts';
import {
    initialFoaCodes,
    buildAreaDeals,
    snapshotArea,
    updateAreaDeal,
    summarizeArea,
} from '../../resources/js/lib/area-preview.ts';
import { syntheticDeals } from '../../resources/js/lib/financing-preview.ts';

test('official master has 106 unique districts under the five approved governments', () => {
    assert.equal(areaRegions.length, 5);
    assert.equal(areaDistricts.length, 106);
    assert.equal(new Set(areaDistricts.map((row) => row.code)).size, 106);
    for (const [code, count] of [
        ['32.17', 16],
        ['32.04', 31],
        ['32.11', 26],
        ['32.73', 30],
        ['32.77', 3],
    ])
        assert.equal(
            areaDistricts.filter((row) => row.regionCode === code).length,
            count,
        );
    assert.ok(
        areaDistricts.every(
            (row) =>
                row.code.startsWith(`${row.regionCode}.`) &&
                areaRegions.some((region) => region.code === row.regionCode),
        ),
    );
    assert.equal(
        areaDistricts.filter((row) => row.name === 'Cisarua').length,
        2,
    );
});

test('area input rejects mismatched districts, requires a city for Kota Lain, and locks DO', () => {
    const padalarang = areaDistricts.find((row) => row.name === 'Padalarang');
    const empty = { regionCode: null, districtCode: null, otherCity: '' };
    const deal = { id: 1, area: empty, snapshot: null };
    const choice = {
        regionCode: padalarang.regionCode,
        districtCode: padalarang.code,
        otherCity: '',
    };
    assert.equal(
        updateAreaDeal(deal, choice, areaDistricts, areaRegions).area
            .districtCode,
        padalarang.code,
    );
    assert.throws(
        () =>
            updateAreaDeal(
                deal,
                { ...choice, regionCode: '32.73' },
                areaDistricts,
                areaRegions,
            ),
        /kecamatan/i,
    );
    assert.throws(
        () =>
            updateAreaDeal(
                deal,
                { regionCode: 'other', districtCode: null, otherCity: ' ' },
                areaDistricts,
                areaRegions,
            ),
        /kota/i,
    );
    assert.throws(
        () =>
            updateAreaDeal(
                { ...deal, doMonth: '2026-11' },
                choice,
                areaDistricts,
                areaRegions,
            ),
        /DO/,
    );
    const other = updateAreaDeal(
        deal,
        { regionCode: 'other', districtCode: null, otherCity: ' Cianjur ' },
        areaDistricts,
        areaRegions,
    );
    assert.deepEqual(other.area, {
        regionCode: 'other',
        districtCode: null,
        otherCity: 'Cianjur',
    });
    assert.deepEqual(deal.area, empty);
});

test('FOA snapshots preserve DO classification after master changes and distinguish duplicate district names', () => {
    const codes = new Set(initialFoaCodes(areaDistricts));
    const padalarang = areaDistricts.find((row) => row.name === 'Padalarang');
    const area = {
        regionCode: padalarang.regionCode,
        districtCode: padalarang.code,
        otherCity: '',
    };
    const snapshot = snapshotArea(area, codes, areaDistricts, areaRegions);
    codes.clear();
    const result = summarizeArea(
        [{ id: 1, area, doMonth: '2026-11', snapshot }],
        '2026-11',
        '2026-11',
    );
    assert.equal(result.foa, 1);
    assert.equal(result.rows[0].name, 'Padalarang · Kab. Bandung Barat');
    assert.equal(
        snapshotArea(area, codes, areaDistricts, areaRegions).isFoa,
        false,
    );
    const cisarua = areaDistricts.filter((row) => row.name === 'Cisarua');
    const rows = cisarua.map((row, i) => {
        const choice = {
            regionCode: row.regionCode,
            districtCode: row.code,
            otherCity: '',
        };
        return {
            id: i + 10,
            area: choice,
            doMonth: '2026-11',
            snapshot: snapshotArea(
                choice,
                new Set(cisarua.map((item) => item.code)),
                areaDistricts,
                areaRegions,
            ),
        };
    });
    const labels = summarizeArea(rows, '2026-11', '2026-11')
        .rows.slice(0, -2)
        .map((row) => row.name);
    assert.equal(new Set(labels).size, 2);
});

test('DO area totals reconcile with financing fixtures; non-FOA and Kota Lain group together, unknown remains separate', () => {
    const deals = buildAreaDeals(syntheticDeals, areaDistricts, areaRegions);
    const result = summarizeArea(deals, '2026-10', '2026-11');
    assert.equal(
        result.total,
        syntheticDeals.filter((row) => row.doMonth).length,
    );
    assert.equal(result.foa + result.other + result.unknown, result.total);
    assert.equal(
        result.rows.reduce((sum, row) => sum + row.count, 0),
        result.total,
    );
    assert.deepEqual(
        result.rows.slice(-2).map((row) => row.id),
        ['other', 'unknown'],
    );
    const cancelled = {
        ...deals.find((row) => row.doMonth),
        id: 999,
        doReversed: true,
    };
    assert.equal(
        summarizeArea([...deals, cancelled], '2026-10', '2026-11').total,
        result.total,
    );
    assert.equal(summarizeArea(deals, '2026-12', '2026-12').total, 0);
    assert.ok(result.other > 0 && result.unknown > 0 && result.foa > 0);
});
