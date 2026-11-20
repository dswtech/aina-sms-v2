import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ChartExportMenu } from '@/components/chart-export-menu';
import { FilterPanel } from '@/components/filter-panel';
import { MonthRangeFields } from '@/components/month-range-fields';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';
import { chartRowColor, makeAreaChartExports } from '@/lib/chart-export';
import type { AreaReportData, ChartExportData } from '@/lib/chart-export';

export type { AreaReportData };

const muted = '#526175';
const percent = (value: number) =>
    `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;
const shortMonth = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
});
const monthLabel = (month: string) =>
    shortMonth.format(new Date(`${month}-01T00:00:00Z`));

function CardHeading({
    id,
    title,
    hint,
    chart,
}: {
    id: string;
    title: string;
    hint: string;
    chart: ChartExportData;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 id={id} className="font-semibold">
                    {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {hint}
                </p>
            </div>
            <ChartExportMenu chart={chart} />
        </div>
    );
}

/** Donut of the first two rows, then the monthly share (rows after the third). */
function ShareCard({
    id,
    chart,
    trendLabel,
}: {
    id: string;
    chart: ChartExportData;
    trendLabel: string;
}) {
    const [inside, outside] = chart.rows;
    const months = chart.rows.slice(3);
    const circumference = 2 * Math.PI * 40;
    const insideLength = chart.total
        ? (inside.count / chart.total) * circumference
        : 0;
    return (
        <section
            aria-labelledby={id}
            className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
        >
            <CardHeading
                id={id}
                title={chart.title}
                hint={`${chart.total} DO`}
                chart={chart}
            />
            <div className="mt-5 flex flex-wrap items-center gap-6">
                <svg
                    viewBox="0 0 100 100"
                    role="img"
                    aria-label={`${inside.label} ${percent(inside.percentage)}, ${outside.label} ${percent(outside.percentage)}`}
                    className="size-36 shrink-0"
                >
                    <g
                        transform="rotate(-90 50 50)"
                        fill="none"
                        strokeWidth="16"
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={chartRowColor(chart.kind, 'outside')}
                            strokeOpacity={chart.total ? 1 : 0.2}
                        />
                        {insideLength > 0 && (
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke={chartRowColor(chart.kind, inside.id)}
                                strokeDasharray={`${insideLength} ${circumference}`}
                            />
                        )}
                    </g>
                    <text
                        x="50"
                        y="56"
                        textAnchor="middle"
                        className="fill-foreground text-[17px] font-semibold"
                    >
                        {percent(inside.percentage)}
                    </text>
                </svg>
                <dl className="space-y-3 text-sm">
                    {[inside, outside].map((row) => (
                        <div key={row.id} className="flex items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-sm"
                                style={{
                                    background: chartRowColor(
                                        chart.kind,
                                        row.id,
                                    ),
                                }}
                            />
                            <dt>{row.label}</dt>
                            <dd className="font-medium tabular-nums">
                                {row.count}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{trendLabel}</p>
            {/* Up to 24 months: fixed-width columns scroll instead of overlapping. */}
            <div className="mt-2 overflow-x-auto">
                <ol className="flex min-w-full gap-2">
                    {months.map((row) => (
                        <li
                            key={row.id}
                            className="flex w-12 min-w-12 flex-1 flex-col items-center text-xs text-muted-foreground"
                        >
                            <div className="flex h-32 w-full flex-col items-center justify-end gap-1 border-b">
                                <span className="tabular-nums">
                                    {row.base ? percent(row.percentage) : '–'}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="w-full max-w-8 rounded-t"
                                    style={{
                                        height: `${Math.max(row.percentage, 1) * 0.8}px`,
                                        background: chartRowColor(
                                            chart.kind,
                                            row.id,
                                        ),
                                    }}
                                />
                            </div>
                            <span aria-hidden="true" className="mt-1">
                                {monthLabel(row.id.slice('month-'.length))}
                            </span>
                            <span className="sr-only">
                                {row.label}: {row.count} dari {row.base} DO
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** Horizontal bars; zero rows that still count (FOA or PMA) are marked red, muted rows grey. */
function ListCard({
    id,
    chart,
    hint,
    limit,
}: {
    id: string;
    chart: ChartExportData;
    hint: string;
    limit?: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const main = chart.rows.filter((row) => row.id !== 'other');
    const rest = chart.rows.filter((row) => row.id === 'other');
    const shown = limit && !expanded ? main.slice(0, limit) : main;
    const maximum = Math.max(1, ...chart.rows.map((row) => row.count));
    return (
        <section
            aria-labelledby={id}
            className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
        >
            <CardHeading
                id={id}
                title={chart.title}
                hint={hint}
                chart={chart}
            />
            <ul className="mt-5 space-y-2.5">
                {[...shown, ...rest].map((row) => {
                    const empty = !row.muted && row.count === 0;
                    return (
                        <li
                            key={row.id}
                            className={`grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm ${row.id === 'other' ? 'border-t pt-2.5' : ''}`}
                        >
                            <span
                                className={`truncate ${empty ? 'text-destructive' : ''}`}
                                title={row.label}
                            >
                                {row.label}
                            </span>
                            <span
                                aria-hidden="true"
                                className="h-4 rounded-r"
                                style={{
                                    width: `${(row.count / maximum) * 100}%`,
                                    background: row.muted
                                        ? muted
                                        : chartRowColor(chart.kind, row.id),
                                }}
                            />
                            <span
                                className={`text-right tabular-nums ${empty ? 'text-destructive' : ''}`}
                            >
                                {row.count}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {limit !== undefined && main.length > limit && (
                <button
                    type="button"
                    className="mt-4 min-h-11 rounded-md border px-3 text-sm"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded
                        ? 'Tampilkan lebih sedikit'
                        : `Lihat semua ${main.length} kecamatan`}
                </button>
            )}
        </section>
    );
}

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
    const charts = makeAreaChartExports(
        { ...applied, periodLabel, mode: 'do', synthetic: false },
        result,
    );
    const foaShare = charts.foa.rows[0].percentage;
    const pmaShare = charts.pma.rows[0].percentage;
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
                    Berdasarkan DO sah, satu kali per transaksi. FOA dan PMA
                    mengikuti kondisi yang dikunci saat DO.
                </p>
            </FilterPanel>
            <section
                aria-label="Ringkasan Mapping Area"
                className="grid grid-cols-1 gap-x-6 gap-y-5 border-y py-5 sm:grid-cols-3 sm:gap-x-10"
            >
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Total DO</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {result.total}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {periodLabel}
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Porsi FOA</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {percent(foaShare)}
                    </p>
                    <div
                        role="meter"
                        aria-label="Porsi FOA menuju 100%"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={foaShare}
                        className="mt-2 h-1.5 rounded-full bg-muted"
                    >
                        <div
                            className="h-1.5 rounded-full"
                            style={{
                                width: `${foaShare}%`,
                                background: chartRowColor('area-foa', 'foa'),
                            }}
                        />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {result.foa} DO · ukuran penilaian dealer
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Porsi PMA</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {percent(pmaShare)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {result.foa + result.pmaOutsideFoa} DO, termasuk FOA
                    </p>
                </div>
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
                        aria-labelledby="mapping-foa"
                        className="space-y-3"
                    >
                        <div>
                            <h2
                                id="mapping-foa"
                                className="text-lg font-semibold"
                            >
                                FOA
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Kecamatan FOA dealer, ukuran penilaian dealer.
                            </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <ShareCard
                                id="mapping-foa-share"
                                chart={charts.foa}
                                trendLabel="Porsi FOA per bulan"
                            />
                            <ListCard
                                id="mapping-foa-districts"
                                chart={charts.foaDistricts}
                                hint="Kecamatan lain mencakup Kota Lain."
                                limit={8}
                            />
                        </div>
                    </section>
                    <section
                        aria-labelledby="mapping-pma"
                        className="space-y-3"
                    >
                        <div>
                            <h2
                                id="mapping-pma"
                                className="text-lg font-semibold"
                            >
                                PMA
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Kab/kota yang masih digarap dealer, termasuk
                                FOA.
                            </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <ShareCard
                                id="mapping-pma-share"
                                chart={charts.pma}
                                trendLabel="Porsi PMA per bulan"
                            />
                            <ListCard
                                id="mapping-pma-regions"
                                chart={charts.pmaRegions}
                                hint="Kab/kota PMA dulu, lalu luar PMA."
                            />
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
