import type { FinancingMode, summarizeFinancing } from './financing-preview';

const percentageFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    useGrouping: false,
});

export type ChartExportKind =
    | 'financing'
    | 'leasing'
    | 'area-share'
    | 'area-trend'
    | 'area-foa-districts'
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
    regions: {
        id: string;
        name: string;
        isPma: boolean;
        count: number;
        /** DO of this region that came from an FOA district. */
        foa: number;
    }[];
    /** At least six months ending at `to`; may start before `from`. */
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
): Record<'share' | 'trend' | 'foaDistricts' | 'pmaRegions', ChartExportData> {
    const chart = (
        kind: ChartExportData['kind'],
        title: string,
        rows: Omit<ChartExportData['rows'][number], 'percentage'>[],
    ): ChartExportData => ({
        ...meta,
        kind,
        mode: 'do',
        title,
        total: report.total,
        rows: rows.map((row) => ({
            ...row,
            percentage: share(row.count, row.base ?? report.total),
        })),
    });
    const monthly = (key: 'foa' | 'pma', label: string) =>
        report.months.map((m) => ({
            id: key === 'foa' ? 'foa' : 'pmaOutsideFoa',
            label: `${label} ${m.month}`,
            count: m[key],
            base: m.total,
        }));
    return {
        share: chart('area-share', 'Porsi DO di PMA', [
            { id: 'foa', label: 'FOA', count: report.foa },
            {
                id: 'pmaOutsideFoa',
                label: 'PMA di luar FOA',
                count: report.pmaOutsideFoa,
            },
            { id: 'outside', label: 'Luar PMA', count: report.outsidePma },
            {
                id: 'pma',
                label: 'Dalam PMA (FOA + PMA di luar FOA)',
                count: report.foa + report.pmaOutsideFoa,
            },
        ]),
        // The trend covers its own months, which may start before the selected range.
        trend: {
            ...chart('area-trend', 'Tren porsi FOA dan PMA', [
                ...monthly('foa', 'FOA'),
                ...monthly('pma', 'PMA'),
            ]),
            from: report.months[0].month,
            to: report.to,
            total: report.months.reduce((sum, m) => sum + m.total, 0),
        },
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
    if (id === 'other' || id === 'outside') return '#828fa1';
    if (id === 'pmaOutsideFoa' || kind === 'area-pma-regions') return '#5793e8';
    if (kind.startsWith('area')) return '#1769e0';
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

/** Bar length from 0 to 1. Shares use their own percentage; the non-FOA total is text only. */
export function chartBarFraction(
    chart: ChartExportData,
    row: ChartExportData['rows'][number],
): number {
    if (chart.kind === 'area-share' || chart.kind === 'area-trend')
        return row.percentage / 100;
    const scaled = chart.rows.filter(
        (r) => chart.kind !== 'area-foa-districts' || r.id !== 'other',
    );
    return scaled.includes(row)
        ? row.count / Math.max(1, ...scaled.map((r) => r.count))
        : 0;
}

export function layoutDonutLegend(
    rows: { label: string }[],
    measure: (value: string) => number,
) {
    let y = 330;
    return rows.map((row) => {
        const lines = wrapChartLabel(row.label, measure, 300);
        const height = Math.max(78, lines.length * 30 + 24);
        const entry = { lines, y, height };
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
        'area-share': 'porsi-pma',
        'area-trend': 'tren-porsi',
        'area-foa-districts': 'do-kecamatan-foa',
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
