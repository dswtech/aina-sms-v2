import type { FinancingMode, summarizeFinancing } from './financing-preview';

const percentageFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    useGrouping: false,
});

export type ChartExportKind =
    | 'financing'
    | 'leasing'
    | 'area-foa'
    | 'area-foa-districts'
    | 'area-pma'
    | 'area-pma-regions';
export type ChartExportMeta = {
    from: string;
    to: string;
    periodLabel: string;
    mode: FinancingMode;
    synthetic: boolean;
};
export type ChartExportData = ChartExportMeta & {
    kind: ChartExportKind;
    title: string;
    total: number;
    /** Leading rows drawn as donut slices; the rest are legend-only lines. */
    donut?: number;
    rows: {
        id: string;
        label: string;
        count: number;
        percentage: number;
        /** Percentage base for this row when it differs from `total` (monthly shares). */
        base?: number;
        muted?: boolean;
    }[];
};

export type AreaReportData = {
    from: string;
    to: string;
    total: number;
    foa: number;
    pmaOutsideFoa: number;
    outsidePma: number;
    unverified: number;
    districts: {
        id: string;
        name: string;
        regionName: string;
        count: number;
    }[];
    regions: { id: string; name: string; isPma: boolean; count: number }[];
    months: { month: string; total: number; foa: number; pma: number }[];
};

const share = (count: number, base: number) =>
    Number(percentageFormatter.format(base ? (count / base) * 100 : 0));

export function makeChartExport(
    kind: 'financing' | 'leasing',
    meta: ChartExportMeta,
    summary: ReturnType<typeof summarizeFinancing>,
): ChartExportData {
    const total = kind === 'financing' ? summary.total : summary.credit;
    const rows =
        kind === 'financing'
            ? [
                  { id: 'cash', label: 'Cash', count: summary.cash },
                  { id: 'credit', label: 'Kredit', count: summary.credit },
                  {
                      id: 'unknown',
                      label: 'Belum ditentukan',
                      count: summary.unknown,
                  },
              ]
            : summary.leasing.map((row) => ({
                  id: row.id,
                  label: row.name,
                  count: row.count,
              }));
    return {
        ...meta,
        kind,
        title: kind === 'financing' ? 'Cara pembiayaan' : 'Leasing tujuan',
        total,
        rows: rows.map((row) => ({
            ...row,
            percentage: Number(
                percentageFormatter.format(
                    total ? (row.count / total) * 100 : 0,
                ),
            ),
        })),
    };
}

export function chartModeLabel(mode: FinancingMode): string {
    return mode === 'prospect' ? 'Prospek' : 'Realisasi DO';
}

export function makeAreaChartExports(
    meta: ChartExportMeta,
    report: AreaReportData,
): Record<'foa' | 'foaDistricts' | 'pma' | 'pmaRegions', ChartExportData> {
    const chart = (
        kind: ChartExportData['kind'],
        title: string,
        rows: Omit<ChartExportData['rows'][number], 'percentage'>[],
        donut?: number,
    ): ChartExportData => ({
        ...meta,
        kind,
        mode: 'do',
        title,
        total: report.total,
        donut,
        rows: rows.map((row) => ({
            ...row,
            percentage: share(row.count, row.base ?? report.total),
        })),
    });
    const pma = report.foa + report.pmaOutsideFoa;
    const outside = {
        id: 'pmaOutsideFoa',
        label: 'PMA di luar FOA',
        count: report.pmaOutsideFoa,
    };
    const monthly = (key: 'foa' | 'pma', label: string) =>
        report.months.map((m) => ({
            id: `month-${m.month}`,
            label: `${label} ${m.month}`,
            count: m[key],
            base: m.total,
        }));
    return {
        foa: chart(
            'area-foa',
            'Porsi DO di FOA',
            [
                { id: 'foa', label: 'FOA', count: report.foa },
                {
                    id: 'outside',
                    label: 'Di luar FOA',
                    count: report.total - report.foa,
                },
                outside,
                ...monthly('foa', 'FOA'),
            ],
            2,
        ),
        foaDistricts: chart(
            'area-foa-districts',
            'DO per kecamatan FOA',
            report.districts.map((d) => ({
                id: d.id,
                label: d.name,
                count: d.count,
                muted: d.id === 'other' || undefined,
            })),
        ),
        pma: chart(
            'area-pma',
            'Porsi DO di PMA',
            [
                { id: 'pma', label: 'Dalam PMA', count: pma },
                { id: 'outside', label: 'Luar PMA', count: report.outsidePma },
                outside,
                ...monthly('pma', 'PMA'),
            ],
            2,
        ),
        pmaRegions: chart(
            'area-pma-regions',
            'DO per kab/kota',
            report.regions.map((r) => ({
                id: r.id,
                // The group is spelled out so the CSV keeps what the grey bar shows on screen.
                label: r.isPma ? r.name : `${r.name} (luar PMA)`,
                count: r.count,
                muted: !r.isPma || undefined,
            })),
        ),
    };
}

export function chartRowColor(kind: ChartExportKind, id: string): string {
    if (kind === 'financing')
        return (
            (
                {
                    cash: '#1769e0',
                    credit: '#0f172a',
                    unknown: '#526175',
                } as Record<string, string>
            )[id] ?? '#1769e0'
        );
    if (kind === 'leasing') return id === 'unselected' ? '#526175' : '#1769e0';
    if (id === 'other' || id === 'outside') return '#526175';
    if (
        kind === 'area-pma' ||
        kind === 'area-pma-regions' ||
        id === 'pmaOutsideFoa'
    )
        return '#0f766e';
    if (kind === 'area-foa' || kind === 'area-foa-districts') return '#1769e0';
    if (id === 'unknown') return '#94a3b8';
    const palette = [
        '#1769e0',
        '#0f766e',
        '#7c3aed',
        '#b45309',
        '#be185d',
        '#0369a1',
        '#4338ca',
        '#047857',
        '#a21caf',
        '#9a3412',
    ];
    const hash = Array.from(id).reduce(
        (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
        0,
    );
    return palette[hash % palette.length];
}

export function layoutDonutLegend(
    rows: { label: string; base?: number }[],
    measure: (value: string) => number,
) {
    let y = 330;
    let monthly = false;
    // Monthly rows (they carry their own base) are compact and start under a "Per bulan" divider.
    return rows.map((row) => {
        const lines = wrapChartLabel(row.label, measure, 300);
        const compact = row.base !== undefined;
        const divider = compact && !monthly;
        if (divider) y += 64;
        monthly ||= compact;
        const height = compact
            ? Math.max(40, lines.length * 30 + 10)
            : Math.max(78, lines.length * 30 + 24);
        const entry = { lines, y, height, divider };
        y += height;
        return entry;
    });
}

export function chartFilename(
    chart: ChartExportData,
    format: 'png' | 'csv',
): string {
    const slug = {
        financing: 'cara-pembiayaan',
        leasing: 'leasing-tujuan',
        'area-foa': 'porsi-foa',
        'area-foa-districts': 'do-kecamatan-foa',
        'area-pma': 'porsi-pma',
        'area-pma-regions': 'do-kab-kota',
    }[chart.kind];
    return `${slug}-${chart.mode === 'prospect' ? 'prospek' : 'realisasi-do'}-${chart.from}_${chart.to}.${format}`;
}

export function chartCsv(chart: ChartExportData): string {
    const field = (value: string | number) => {
        const text = String(value);
        const safe = /^\s*[=+@-]/.test(text) ? `'${text}` : text;
        return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows: (string | number)[][] = [
        [
            'periode_awal',
            'periode_akhir',
            'dasar_laporan',
            'kategori',
            'jumlah',
            'total_acuan',
            'persentase',
            'status_data',
        ],
    ];
    for (const row of chart.rows)
        rows.push([
            chart.from,
            chart.to,
            chartModeLabel(chart.mode),
            row.label,
            row.count,
            row.base ?? chart.total,
            new Intl.NumberFormat('id-ID', {
                maximumFractionDigits: 1,
                useGrouping: false,
            }).format(row.percentage),
            chart.synthetic ? 'Data contoh' : 'Data laporan',
        ]);
    return `\uFEFF${rows.map((row) => row.map(field).join(';')).join('\r\n')}\r\n`;
}

export function wrapChartLabel(
    text: string,
    measure: (value: string) => number,
    width: number,
): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate) <= width) {
            line = candidate;
            continue;
        }
        if (line) {
            lines.push(line);
            line = '';
        }
        for (const character of word) {
            if (line && measure(line + character) > width) {
                lines.push(line);
                line = '';
            }
            line += character;
        }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
}
