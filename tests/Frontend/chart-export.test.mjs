import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    makeChartExport,
    chartCsv,
    chartFilename,
    wrapChartLabel,
    makeAreaChartExports,
    chartRowColor,
    chartBarFraction,
} from '../../resources/js/lib/chart-export.ts';

const areaMeta = {
    from: '2026-09',
    to: '2026-10',
    periodLabel: 'September 2026 – Oktober 2026',
    mode: 'prospect',
    synthetic: false,
};
const areaReport = {
    from: '2026-09',
    to: '2026-10',
    total: 120,
    foa: 78,
    pmaOutsideFoa: 30,
    outsidePma: 12,
    unverified: 0,
    districts: [
        { id: '32.17.06', name: 'Ngamprah', regionName: 'Kabupaten Bandung Barat', count: 78 },
        { id: '32.17.15', name: 'Gununghalu', regionName: 'Kabupaten Bandung Barat', count: 0 },
        { id: 'other', name: 'Kecamatan lain', regionName: '', count: 42 },
    ],
    regions: [
        { id: '32.17', name: 'Kabupaten Bandung Barat', isPma: true, count: 82, foa: 78 },
        { id: '32.77', name: 'Kota Cimahi', isPma: true, count: 26, foa: 0 },
        { id: '32.11', name: 'Kabupaten Sumedang', isPma: false, count: 4, foa: 0 },
        { id: 'other', name: 'Kota Lain', isPma: false, count: 8, foa: 0 },
    ],
    months: [
        { month: '2026-09', total: 50, foa: 30, pma: 45 },
        { month: '2026-10', total: 70, foa: 48, pma: 63 },
    ],
};

test('area exports cover the PMA split, its trend, districts and regions', () => {
    const { share, trend, foaDistricts, pmaRegions } = makeAreaChartExports(areaMeta, areaReport);
    assert.equal(share.mode, 'do');
    assert.deepEqual(
        share.rows.map(({ label, count, percentage }) => [label, count, percentage]),
        [['FOA', 78, 65], ['PMA di luar FOA', 30, 25], ['Luar PMA', 12, 10], ['Dalam PMA (FOA + PMA di luar FOA)', 108, 90]],
    );
    assert.deepEqual(
        trend.rows.map(({ label, count, base, percentage }) => [label, count, base, percentage]),
        [['FOA 2026-09', 30, 50, 60], ['FOA 2026-10', 48, 70, 68.6], ['PMA 2026-09', 45, 50, 90], ['PMA 2026-10', 63, 70, 90]],
    );
    const padded = makeAreaChartExports(areaMeta, { ...areaReport, months: [{ month: '2026-05', total: 10, foa: 1, pma: 2 }, ...areaReport.months] }).trend;
    assert.equal(chartFilename(padded, 'csv'), 'tren-porsi-realisasi-do-2026-05_2026-10.csv');
    assert.equal(padded.total, 130);
    assert.deepEqual(foaDistricts.rows.map((row) => row.label), ['Ngamprah', 'Gununghalu', 'Kecamatan lain']);
    assert.equal(foaDistricts.rows.at(-1).muted, true);
    assert.deepEqual(pmaRegions.rows.map((row) => row.muted ?? false), [false, false, true, true]);
    assert.deepEqual(pmaRegions.rows.map((row) => row.label), ['Kabupaten Bandung Barat', 'Kota Cimahi', 'Kabupaten Sumedang (luar PMA)', 'Kota Lain (luar PMA)']);
    assert.equal(chartFilename(share, 'csv'), 'porsi-pma-realisasi-do-2026-09_2026-10.csv');
    assert.equal(chartFilename(trend, 'csv'), 'tren-porsi-realisasi-do-2026-09_2026-10.csv');
    assert.equal(chartFilename(foaDistricts, 'png'), 'do-kecamatan-foa-realisasi-do-2026-09_2026-10.png');
    assert.equal(chartFilename(pmaRegions, 'csv'), 'do-kab-kota-realisasi-do-2026-09_2026-10.csv');
    assert.ok(chartCsv(trend).split('\r\n')[1].includes('"FOA 2026-09";"30";"50";"60"'));
    assert.ok(chartCsv(share).split('\r\n')[1].includes('"FOA";"78";"120";"65"'));
    assert.equal(new Set(['foa', 'pmaOutsideFoa', 'outside'].map((id) => chartRowColor('area-share', id))).size, 3);
});

test('area PNG bars use shares, and the non-FOA total never sets the district scale', () => {
    const { share, trend, foaDistricts } = makeAreaChartExports(areaMeta, areaReport);
    assert.equal(chartBarFraction(share, share.rows[0]), 0.65);
    assert.equal(chartBarFraction(trend, trend.rows[2]), 0.9);
    const districts = { ...foaDistricts, rows: foaDistricts.rows.map((row) => row.id === 'other' ? { ...row, count: 900 } : row) };
    assert.equal(chartBarFraction(districts, districts.rows[0]), 1);
    assert.equal(chartBarFraction(districts, districts.rows.at(-1)), 0);
});

test('area exports stay zero-safe on an empty range', () => {
    const empty = { ...areaReport, total: 0, foa: 0, pmaOutsideFoa: 0, outsidePma: 0,
        districts: [{ id: 'other', name: 'Kecamatan lain', regionName: '', count: 0 }], regions: [],
        months: [{ month: '2026-09', total: 0, foa: 0, pma: 0 }] };
    for (const chart of Object.values(makeAreaChartExports(areaMeta, empty))) {
        assert.ok(chart.rows.every((row) => Number.isFinite(row.percentage) && row.percentage === 0));
        assert.ok(chart.rows.every((row) => chartBarFraction(chart, row) === 0));
    }
});

import {
    summarizeFinancing,
    syntheticDeals,
    initialLeasing,
} from '../../resources/js/lib/financing-preview.ts';

const meta = {
    from: '2026-10',
    to: '2026-11',
    periodLabel: 'Oktober 2026 – November 2026',
    mode: 'prospect',
    synthetic: true,
};
const summary = () =>
    summarizeFinancing(
        syntheticDeals,
        initialLeasing,
        meta.from,
        meta.mode,
        meta.to,
    );

test('exports snapshot the applied cohort with the correct percentage denominator', () => {
    const data = summary();
    const financing = makeChartExport('financing', meta, data);
    const leasing = makeChartExport('leasing', meta, data);
    assert.equal(financing.total, 160);
    assert.equal(leasing.total, 90);
    assert.equal(
        financing.rows.reduce((sum, row) => sum + row.count, 0),
        160,
    );
    assert.equal(
        leasing.rows.reduce((sum, row) => sum + row.count, 0),
        90,
    );
    assert.equal(
        financing.rows.find((row) => row.id === 'cash').percentage,
        31.3,
    );
    assert.deepEqual(
        leasing.rows.slice(-2).map((row) => row.id),
        ['other', 'unselected'],
    );
    const firstName = leasing.rows[0].label;
    data.leasing[0].name = 'Changed while exporting';
    data.leasing[0].count = 999;
    assert.equal(leasing.rows[0].label, firstName);
    assert.notEqual(leasing.rows[0].count, 999);
    assert.equal(
        chartFilename(leasing, 'png'),
        'leasing-tujuan-prospek-2026-10_2026-11.png',
    );
    assert.equal(
        chartFilename({ ...financing, mode: 'do' }, 'csv'),
        'cara-pembiayaan-realisasi-do-2026-10_2026-11.csv',
    );
});

test('CSV includes BOM, metadata, localized numbers and a synthetic-data marker', () => {
    const csv = chartCsv(makeChartExport('financing', meta, summary()));
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(
        csv.includes(
            '"periode_awal";"periode_akhir";"dasar_laporan";"kategori";"jumlah";"total_acuan";"persentase";"status_data"\r\n',
        ),
    );
    assert.ok(
        csv.includes(
            '"2026-10";"2026-11";"Prospek";"Cash";"50";"160";"31,3";"Data contoh"',
        ),
    );
    assert.ok(csv.endsWith('\r\n'));
    assert.equal(csv.split('\r\n').length, 5);
});

test('percentage rounding matches the visible report at floating-point boundaries', () => {
    const report = makeChartExport('financing', meta, {
        total: 80,
        cash: 23,
        credit: 57,
        unknown: 0,
        leasing: [{ id: 'acc', name: 'ACC', count: 57 }],
    });
    assert.equal(report.rows[0].percentage, 28.7);
    assert.ok(chartCsv(report).includes('"Cash";"23";"80";"28,7"'));
});

test('CSV safely quotes labels and neutralizes spreadsheet formulas including leading whitespace', () => {
    const names = [
        '=2+2',
        '  +SUM(A1)',
        '@formula',
        '-formula',
        'Nama; "Finance"\nLain',
    ];
    const report = makeChartExport('leasing', meta, {
        total: 5,
        cash: 0,
        credit: 5,
        unknown: 0,
        leasing: names.map((name, i) => ({ id: String(i), name, count: 1 })),
    });
    const csv = chartCsv(report);
    for (const name of names.slice(0, 4)) assert.ok(csv.includes(`"'${name}"`));
    assert.ok(csv.includes('"Nama; ""Finance""\nLain"'));
});

test('zero credit keeps zero-valued categories and never exports NaN or Infinity', () => {
    const report = makeChartExport('leasing', meta, {
        total: 2,
        cash: 2,
        credit: 0,
        unknown: 0,
        leasing: [
            { id: 'other', name: 'Kredit Lain', count: 0 },
            { id: 'unselected', name: 'Leasing belum dipilih', count: 0 },
        ],
    });
    assert.equal(report.total, 0);
    assert.deepEqual(
        report.rows.map((row) => row.percentage),
        [0, 0],
    );
    assert.ok(
        chartCsv(report).includes('"Kredit Lain";"0";"0";"0";"Data contoh"'),
    );
    assert.doesNotMatch(chartCsv(report), /NaN|Infinity/);
});

test('PNG label wrapping retains long words and Unicode characters without clipping', () => {
    const measure = (text) => Array.from(text).length;
    const lines = wrapChartLabel('Mandiri Utama Finance', measure, 10);
    assert.deepEqual(lines, ['Mandiri', 'Utama', 'Finance']);
    assert.deepEqual(wrapChartLabel('ABCDEFGHIJKLM', measure, 5), [
        'ABCDE',
        'FGHIJ',
        'KLM',
    ]);
    assert.deepEqual(wrapChartLabel('銀行銀行銀行', measure, 3), [
        '銀行銀',
        '行銀行',
    ]);
    assert.ok(lines.every((line) => measure(line) <= 10));
});
