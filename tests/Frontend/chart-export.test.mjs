import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    makeChartExport,
    chartCsv,
    chartFilename,
    wrapChartLabel,
    makeAreaChartExport,
    chartRowColor,
    layoutDonutLegend,
} from '../../resources/js/lib/chart-export.ts';

test('area exports use all DO as denominator and dynamic donut legends preserve long categories', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
        id: `32.17.${String(i + 1).padStart(2, '0')}`,
        name: `Kecamatan Contoh ${i} · Kabupaten Bandung Barat dengan nama panjang`,
        count: 1,
    }));
    const report = makeAreaChartExport(
        {
            from: '2026-10',
            to: '2026-11',
            periodLabel: 'Oktober 2026 – November 2026',
            mode: 'prospect',
            synthetic: true,
        },
        { total: 10, rows },
    );
    assert.equal(report.mode, 'do');
    assert.equal(report.rows[0].percentage, 10);
    assert.equal(
        chartFilename(report, 'png'),
        'mapping-area-realisasi-do-2026-10_2026-11.png',
    );
    assert.ok(chartCsv(report).includes('"Realisasi DO"'));
    const layout = layoutDonutLegend(report.rows, (text) => text.length * 12);
    assert.ok(layout.at(-1).y + layout.at(-1).height > 650);
    assert.ok(
        layout.every(
            (row, i) => !i || row.y >= layout[i - 1].y + layout[i - 1].height,
        ),
    );
    assert.ok(
        layout.every((row) =>
            row.lines.every((line) => line.length * 12 <= 300),
        ),
    );
    assert.equal(
        chartRowColor('area', '32.17.08'),
        chartRowColor('area', '32.17.08'),
    );
    assert.notEqual(
        chartRowColor('area', '32.17.08'),
        chartRowColor('area', '32.17.06'),
    );
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
