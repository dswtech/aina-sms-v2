import { router, usePage } from '@inertiajs/react';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChartExportMenu } from '@/components/chart-export-menu';
import { BarRow } from '@/components/mapping-area/bar-row';
import { FoaSection } from '@/components/mapping-area/foa-section';
import { Trend } from '@/components/mapping-area/trend';
import { MonthRangeFields } from '@/components/month-range-fields';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatShare, shortRegionName } from '@/lib/area-map';
import { chartRowColor, makeAreaChartExports } from '@/lib/chart-export';
import type { AreaReportData, ChartExportData } from '@/lib/chart-export';
import {
    formatMonthRange,
    monthRangeError,
    monthsBefore,
} from '@/lib/month-range';

export type { AreaReportData };

const colors = {
    foa: chartRowColor('area-share', 'foa'),
    pma: chartRowColor('area-share', 'pmaOutsideFoa'),
    outside: chartRowColor('area-share', 'outside'),
};
const presets = [
    { months: 1, label: 'Bulan ini' },
    { months: 3, label: '3 bulan' },
    { months: 6, label: '6 bulan' },
];

function Card({
    id,
    title,
    hint,
    chart,
    children,
}: {
    id: string;
    title: string;
    hint: string;
    chart: ChartExportData;
    children: ReactNode;
}) {
    return (
        <section
            aria-labelledby={id}
            className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 id={id} className="font-semibold">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {hint}
                    </p>
                </div>
                <ChartExportMenu chart={chart} />
            </div>
            {children}
        </section>
    );
}

/** One 100% bar: FOA sits inside PMA, so both shares read off the same line. */
function ShareBar({ result }: { result: AreaReportData }) {
    const pma = result.foa + result.pmaOutsideFoa;
    const parts = [
        { label: 'FOA', count: result.foa, color: colors.foa },
        {
            label: 'PMA di luar FOA',
            count: result.pmaOutsideFoa,
            color: colors.pma,
        },
        { label: 'Luar PMA', count: result.outsidePma, color: colors.outside },
    ];
    return (
        <div className="mt-4">
            <p className="text-sm">
                Dalam PMA{' '}
                <strong className="font-semibold tabular-nums">
                    {pma} DO · {formatShare(pma, result.total)}
                </strong>
            </p>
            {pma > 0 && (
                <div
                    aria-hidden="true"
                    className="mt-1 h-2 border-x border-t border-muted-foreground"
                    style={{ width: `${(pma / result.total) * 100}%` }}
                />
            )}
            <div
                aria-hidden="true"
                className="mt-1 flex h-9 gap-0.5 overflow-hidden rounded-md bg-muted"
            >
                {parts
                    .filter((part) => part.count > 0)
                    .map((part) => (
                        <span
                            key={part.label}
                            style={{
                                flexGrow: part.count,
                                flexBasis: 0,
                                background: part.color,
                            }}
                        />
                    ))}
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {parts.map((part) => (
                    <div
                        key={part.label}
                        className="flex items-baseline gap-2 sm:block"
                    >
                        <dt className="flex items-center gap-2 text-muted-foreground">
                            <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-sm"
                                style={{ background: part.color }}
                            />
                            {part.label}
                        </dt>
                        <dd className="ml-auto tabular-nums sm:mt-1 sm:ml-0">
                            <span className="font-semibold">
                                {part.count} DO
                            </span>{' '}
                            · {formatShare(part.count, result.total)}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function RegionList({ result }: { result: AreaReportData }) {
    const maximum = Math.max(1, ...result.regions.map((row) => row.count));
    return [true, false].map((isPma) => {
        const rows = result.regions.filter((row) => row.isPma === isPma);
        // Summed from the rows below it; an FOA district may sit in a region outside PMA.
        const count = rows.reduce((sum, row) => sum + row.count, 0);
        return (
            <div key={String(isPma)} className="mt-4">
                <h3 className="flex justify-between gap-3 text-sm font-medium">
                    {isPma ? 'Kab/kota PMA' : 'Kab/kota luar PMA'}
                    <span className="font-normal text-muted-foreground tabular-nums">
                        {count} DO · {formatShare(count, result.total)}
                    </span>
                </h3>
                <ul className="mt-2">
                    {rows.map((row) => (
                        <li
                            key={row.id}
                            className={
                                isPma && !row.count
                                    ? 'text-destructive'
                                    : undefined
                            }
                        >
                            <BarRow
                                label={shortRegionName(row.name)}
                                parts={[
                                    { count: row.foa, color: colors.foa },
                                    {
                                        count: row.count - row.foa,
                                        color: isPma
                                            ? colors.pma
                                            : colors.outside,
                                    },
                                ]}
                                maximum={maximum}
                                total={result.total}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        );
    });
}

function PeriodPicker({
    result,
    scope,
}: {
    result: AreaReportData;
    scope: string;
}) {
    const [from, setFrom] = useState(result.from);
    const [to, setTo] = useState(result.to);
    const [thisMonth] = useState(() => monthsBefore(null, 0));
    const matched = presets.find(
        ({ months }) =>
            result.to === thisMonth &&
            result.from === monthsBefore(thisMonth, months - 1),
    );
    const [custom, setCustom] = useState(!matched);
    const change = (start: string, end: string) => {
        setFrom(start);
        setTo(end);
        if (!monthRangeError(start, end))
            router.get(
                '/analytics/mapping-area',
                { from: start, to: end },
                { preserveState: true, preserveScroll: true, replace: true },
            );
    };
    return (
        <section aria-label="Periode Mapping Area" className="space-y-3">
            <ToggleGroup
                type="single"
                aria-label="Periode"
                value={custom ? 'custom' : String(matched?.months ?? '')}
                onValueChange={(value) => {
                    if (!value) return;
                    setCustom(value === 'custom');
                    if (value !== 'custom')
                        change(
                            monthsBefore(thisMonth, Number(value) - 1),
                            thisMonth,
                        );
                }}
                className="w-full gap-0.5 rounded-[10px] bg-muted p-[3px] sm:w-fit"
            >
                {[
                    ...presets.map(({ months, label }) => ({
                        value: String(months),
                        label,
                    })),
                    { value: 'custom', label: 'Pilih rentang' },
                ].map(({ value, label }) => (
                    <ToggleGroupItem
                        key={value}
                        value={value}
                        className="h-11 flex-1 rounded-[7px] px-1.5 text-[13px] font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:flex-none sm:px-4"
                    >
                        {label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            {custom && (
                <div className="max-w-2xl">
                    <MonthRangeFields
                        id="mapping-period"
                        from={from}
                        to={to}
                        onChange={change}
                    />
                </div>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
                Cakupan: {scope}. Berdasarkan DO sah, satu kali per transaksi.
                FOA dan PMA mengikuti kondisi yang dikunci saat DO.
            </p>
        </section>
    );
}

export function AreaReport({ result }: { result: AreaReportData }) {
    const byTeam = usePage().props.auth.user.role === 'supervisor';
    const periodLabel = formatMonthRange(result.from, result.to);
    const charts = makeAreaChartExports(
        {
            from: result.from,
            to: result.to,
            periodLabel,
            mode: 'do',
            synthetic: false,
        },
        result,
    );
    const pma = result.foa + result.pmaOutsideFoa;
    const trendLabel = formatMonthRange(
        result.months[0].month,
        result.months[result.months.length - 1].month,
    );
    return (
        <div className="space-y-6">
            <PeriodPicker
                result={result}
                scope={byTeam ? 'tim Anda' : 'seluruh dealer'}
            />
            {result.unverified > 0 && (
                <p className="flex items-start gap-2 rounded-xl border px-5 py-4 text-sm leading-6">
                    <CircleAlert
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0"
                    />
                    {result.unverified} DO pada rentang ini belum memiliki area
                    terverifikasi dan tidak dihitung. Tinjau sebelum laporan
                    dipakai.
                </p>
            )}
            <section
                aria-label="Ringkasan Mapping Area"
                className="grid grid-cols-3 gap-x-3 border-y py-5 sm:gap-x-10"
            >
                {[
                    {
                        label: 'Total DO',
                        value: String(result.total),
                        note: periodLabel,
                    },
                    {
                        label: 'Porsi FOA',
                        value: formatShare(result.foa, result.total),
                        note: `${result.foa} DO${byTeam ? '' : ' · ukuran penilaian dealer'}`,
                    },
                    {
                        label: 'Porsi PMA',
                        value: formatShare(pma, result.total),
                        note: `${pma} DO, termasuk FOA`,
                    },
                ].map(({ label, value, note }) => (
                    <div key={label} className="min-w-0">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                            {value}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {note}
                        </p>
                    </div>
                ))}
            </section>
            {!result.total && (
                <section className="rounded-xl border px-6 py-10 text-center">
                    <h2 className="text-lg font-semibold">
                        {result.unverified
                            ? 'Belum ada DO terverifikasi pada rentang ini'
                            : 'Belum ada DO pada rentang ini'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Kecamatan FOA dan kab/kota PMA tetap ditampilkan dengan
                        angka 0. Pilih rentang bulan lain untuk melihat DO yang
                        sudah tercatat.
                    </p>
                </section>
            )}
            <Card
                id="mapping-pma-share"
                title={charts.share.title}
                hint="FOA termasuk dalam PMA."
                chart={charts.share}
            >
                <ShareBar result={result} />
            </Card>
            <FoaSection
                result={result}
                chart={charts.foaDistricts}
                byTeam={byTeam}
            />
            <div className="grid gap-4 lg:grid-cols-2">
                <Card
                    id="mapping-trend"
                    title={charts.trend.title}
                    hint={trendLabel}
                    chart={{ ...charts.trend, periodLabel: trendLabel }}
                >
                    <Trend months={result.months} />
                </Card>
                <Card
                    id="mapping-pma-regions"
                    title={charts.pmaRegions.title}
                    hint="Biru tua adalah DO dari kecamatan FOA."
                    chart={charts.pmaRegions}
                >
                    <RegionList result={result} />
                </Card>
            </div>
        </div>
    );
}
