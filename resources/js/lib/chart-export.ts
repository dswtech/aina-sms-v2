import type { FinancingMode, summarizeFinancing } from './financing-preview';

const percentageFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    useGrouping: false,
});

export type ChartExportKind = 'financing' | 'leasing' | 'area';
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
    rows: { id: string; label: string; count: number; percentage: number }[];
};

export function makeChartExport(
    kind: Exclude<ChartExportKind, 'area'>,
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

export function makeAreaChartExport(
    meta: ChartExportMeta,
    summary: {
        total: number;
        rows: { id: string; name: string; count: number }[];
    },
): ChartExportData {
    return {
        ...meta,
        kind: 'area',
        mode: 'do',
        title: 'Penjualan berdasarkan area',
        total: summary.total,
        rows: summary.rows.map((row) => ({
            id: row.id,
            label: row.name,
            count: row.count,
            percentage: Number(
                percentageFormatter.format(
                    summary.total ? (row.count / summary.total) * 100 : 0,
                ),
            ),
        })),
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
    if (id === 'other') return '#526175';
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
    return `${chart.kind === 'financing' ? 'cara-pembiayaan' : chart.kind === 'area' ? 'mapping-area' : 'leasing-tujuan'}-${chart.mode === 'prospect' ? 'prospek' : 'realisasi-do'}-${chart.from}_${chart.to}.${format}`;
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
            chart.total,
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
