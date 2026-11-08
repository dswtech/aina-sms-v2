import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ChartExportMenu } from '@/components/chart-export-menu';
import { FilterPanel } from '@/components/filter-panel';
import { MonthRangeFields } from '@/components/month-range-fields';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';
import { chartRowColor, makeAreaChartExport } from '@/lib/chart-export';

const percentage = (count: number, total: number) =>
    `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(total ? (count / total) * 100 : 0)}%`;

export type AreaReportData = {
    from: string;
    to: string;
    total: number;
    foa: number;
    other: number;
    unverified: number;
    rows: {
        id: string;
        name: string;
        districtName: string;
        regionName: string;
        category: 'foa' | 'other';
        count: number;
    }[];
};

export function AreaReport({ result }: { result: AreaReportData }) {
    const [from, setFrom] = useState(result.from);
    const [to, setTo] = useState(result.to);
    const applied = { from: result.from, to: result.to };
    const visit = (range: { from: string; to: string }) =>
        router.get('/analytics/mapping-area', range, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    const periodLabel = formatMonthRange(applied.from, applied.to);
    const chart = makeAreaChartExport(
        { ...applied, periodLabel, mode: 'do', synthetic: false },
        result,
    );
    return (
        <div className="space-y-6">
            <FilterPanel
                iconOnly
                title="Filter Mapping Area"
                summary={`${periodLabel} · Realisasi DO`}
            >
                <MonthRangeFields
                    id="mapping-period"
                    from={from}
                    to={to}
                    onChange={(start, end) => {
                        setFrom(start);
                        setTo(end);
                        if (!monthRangeError(start, end))
                            visit({ from: start, to: end });
                    }}
                />
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Berdasarkan DO sah, satu kali per transaksi. FOA mengikuti
                    kondisi yang dikunci saat DO.
                </p>
            </FilterPanel>
            <section
                aria-label="Ringkasan Mapping Area"
                className="grid grid-cols-1 gap-x-6 gap-y-5 border-y py-5 sm:grid-cols-3 sm:gap-x-10 lg:grid-cols-3"
            >
                {[
                    {
                        label: 'Total DO',
                        value: result.total,
                        hint: periodLabel,
                    },
                    {
                        label: 'Dalam FOA',
                        value: result.foa,
                        hint:
                            percentage(result.foa, result.total) +
                            ' dari seluruh DO',
                    },
                    {
                        label: 'Area lain',
                        value: result.other,
                        hint: 'Kecamatan non-FOA dan Kota Lain',
                    },
                ].map((metric) => (
                    <div key={metric.label} className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                            {metric.value}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {metric.hint}
                        </p>
                    </div>
                ))}
            </section>
            {!result.total ? (
                <section className="rounded-xl border px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold">
                        Belum ada DO pada rentang ini
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Pilih rentang bulan lain untuk melihat DO yang sudah
                        tercatat.
                    </p>
                </section>
            ) : (
                <>
                    <section
                        aria-labelledby="mapping-chart-title"
                        className="rounded-xl border bg-card p-5 sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2
                                    id="mapping-chart-title"
                                    className="font-semibold"
                                >
                                    Penjualan berdasarkan area
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {periodLabel} · Realisasi DO ·{' '}
                                    {result.total} transaksi
                                </p>
                            </div>
                            <ChartExportMenu chart={chart} />
                        </div>
                        <div className="grid items-center gap-8 py-7 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                            <div className="flex justify-center">
                                <svg
                                    viewBox="0 0 200 200"
                                    role="img"
                                    aria-label={result.rows
                                        .map(
                                            (row) =>
                                                `${row.name}: ${row.count} DO, ${percentage(row.count, result.total)}`,
                                        )
                                        .join('. ')}
                                    className="h-auto w-full max-w-80"
                                >
                                    {result.rows.map((row, index) => {
                                        if (!row.count) return null;
                                        const start =
                                            -Math.PI / 2 +
                                            (result.rows
                                                .slice(0, index)
                                                .reduce(
                                                    (sum, item) =>
                                                        sum + item.count,
                                                    0,
                                                ) /
                                                result.total) *
                                                Math.PI *
                                                2;
                                        const sweep =
                                            (row.count / result.total) *
                                            Math.PI *
                                            2;
                                        const end = start + sweep;
                                        const middle = start + sweep / 2;
                                        const x = 100 + Math.cos(middle) * 57;
                                        const y = 100 + Math.sin(middle) * 57;
                                        const showName =
                                            row.count / result.total >= 0.15;
                                        const label =
                                            row.category === 'foa'
                                                ? row.districtName
                                                : 'Area lain';
                                        return (
                                            <g key={row.id}>
                                                {row.count === result.total ? (
                                                    <circle
                                                        cx="100"
                                                        cy="100"
                                                        r="96"
                                                        fill={chartRowColor(
                                                            'area',
                                                            row.id,
                                                        )}
                                                    />
                                                ) : (
                                                    <path
                                                        d={`M 100 100 L ${100 + 96 * Math.cos(start)} ${100 + 96 * Math.sin(start)} A 96 96 0 ${sweep > Math.PI ? 1 : 0} 1 ${100 + 96 * Math.cos(end)} ${100 + 96 * Math.sin(end)} Z`}
                                                        fill={chartRowColor(
                                                            'area',
                                                            row.id,
                                                        )}
                                                        stroke="white"
                                                        strokeWidth="1"
                                                    />
                                                )}
                                                {row.count / result.total >=
                                                    0.04 && (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        textAnchor="middle"
                                                        fill="white"
                                                        fontSize="8"
                                                        fontWeight="600"
                                                    >
                                                        {showName && (
                                                            <tspan
                                                                x={x}
                                                                dy="-3"
                                                            >
                                                                {label}
                                                            </tspan>
                                                        )}
                                                        <tspan
                                                            x={x}
                                                            dy={
                                                                showName
                                                                    ? '11'
                                                                    : '3'
                                                            }
                                                        >
                                                            {percentage(
                                                                row.count,
                                                                result.total,
                                                            )}
                                                        </tspan>
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                            <dl className="space-y-4">
                                {result.rows.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex items-start gap-3 text-sm"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="mt-1.5 size-2.5 shrink-0 rounded-sm"
                                            style={{
                                                background: chartRowColor(
                                                    'area',
                                                    row.id,
                                                ),
                                            }}
                                        />
                                        <dt className="min-w-0 flex-1 leading-6 wrap-break-word">
                                            {row.name}
                                        </dt>
                                        <dd className="flex shrink-0 gap-3 leading-6 tabular-nums">
                                            <span className="font-medium">
                                                {row.count}
                                            </span>
                                            <span className="w-14 text-right text-muted-foreground">
                                                {percentage(
                                                    row.count,
                                                    result.total,
                                                )}
                                            </span>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
                            Area lain mencakup seluruh kecamatan non-FOA dan
                            Kota Lain. Area wajib lengkap sebelum DO. Persentase
                            dihitung dari seluruh DO sah.
                        </p>
                    </section>
                    <section
                        aria-labelledby="mapping-detail-title"
                        className="overflow-hidden rounded-xl border bg-card"
                    >
                        <div className="px-5 py-4">
                            <h2
                                id="mapping-detail-title"
                                className="font-semibold"
                            >
                                Rincian penjualan
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Pengelompokan mengikuti snapshot saat DO, bukan
                                daftar FOA terbaru.
                            </p>
                        </div>
                        <div className="md:hidden">
                            {result.rows.map((row) => (
                                <div
                                    key={row.id}
                                    className="striped-row px-5 py-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="min-w-0 text-sm leading-6 font-medium">
                                            {row.name}
                                        </p>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                                            {row.count} DO
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {row.category === 'foa'
                                            ? 'FOA'
                                            : 'Non-FOA'}{' '}
                                        · {percentage(row.count, result.total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <table className="hidden w-full table-fixed text-sm md:table">
                            <caption className="sr-only">
                                Rincian DO menurut kecamatan FOA dan area
                                lainnya
                            </caption>
                            <thead className="border-y text-xs text-muted-foreground">
                                <tr>
                                    <th
                                        scope="col"
                                        className="w-[28%] px-5 py-3 text-left font-medium"
                                    >
                                        Kecamatan
                                    </th>
                                    <th
                                        scope="col"
                                        className="w-[30%] px-3 py-3 text-left font-medium"
                                    >
                                        Kabupaten/Kota
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-3 py-3 text-left font-medium"
                                    >
                                        Kelompok
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-3 py-3 text-right font-medium"
                                    >
                                        DO
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right font-medium"
                                    >
                                        Porsi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.rows.map((row) => (
                                    <tr key={row.id} className="striped-row">
                                        <th
                                            scope="row"
                                            className="px-5 py-3 text-left font-normal wrap-break-word"
                                        >
                                            {row.districtName || row.name}
                                        </th>
                                        <td className="px-3 py-3 wrap-break-word">
                                            {row.regionName ||
                                                (row.category === 'other'
                                                    ? 'Gabungan'
                                                    : '—')}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.category === 'foa'
                                                ? 'FOA'
                                                : 'Non-FOA'}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {row.count}
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums">
                                            {percentage(
                                                row.count,
                                                result.total,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-between border-t px-5 py-4 text-sm font-semibold">
                            <span>Total DO sah</span>
                            <span className="tabular-nums">
                                {result.total} DO · 100%
                            </span>
                        </div>
                    </section>
                </>
            )}
            {result.unverified > 0 && (
                <p
                    role="alert"
                    className="rounded-xl border px-5 py-4 text-sm leading-6"
                >
                    {result.unverified} DO pada rentang ini belum memiliki area
                    terverifikasi dan tidak dihitung. Tinjau sebelum laporan
                    dipakai.
                </p>
            )}
        </div>
    );
}
