import { MonthPicker } from '@/components/date-picker';
import type { StageAchievementData } from '@/components/stage-achievement-table';
import type { TargetPlan } from '@/components/target-plan-editor';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import InputError from '@/components/input-error';
import { formatMonth } from '@/lib/calendar';
import { formatRelativeTime } from '@/lib/notifications';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type Metrics = {
    target_units: number | null;
    realization_units: number;
    forecast_units: number | null;
    gap_units: number | null;
    forecast_gap_units: number | null;
    missing_closing_month_count?: number;
    missing_do_history_count?: number;
    forecast_stages?: ForecastStage[] | null;
};
export type ForecastStage = {
    stage: string;
    count: number;
    weight: number;
    units: number;
};
export type PerformanceRow = Metrics & {
    id: number | string;
    name: string;
    username?: string;
    team_name?: string | null;
    is_current_member?: boolean;
    is_active?: boolean;
    sales_target_units?: number | null;
    sales_targets_missing?: number;
    target_allocation_difference?: number | null;
    benchmark_units?: number | null;
    allocation_percent?: number | null;
    active_allocation_units?: number | null;
    achievement_percent?: number | null;
    benchmark_achievement_percent?: number | null;
    benchmark_gap_units?: number | null;
    benchmark_forecast_gap_units?: number | null;
};
type Priority = {
    id?: string;
    public_id?: string;
    customer_name?: string | null;
    vehicle_model?: string | null;
    sales_name?: string | null;
    stage?: string;
    last_activity_at?: string | null;
    author_name?: string | null;
    excerpt?: string;
    estimated_value?: number | null;
    expected_closing_month?: string | null;
    url: string;
};
export type ReportingProps = {
    dashboard: {
        period: string;
        targetUnits: number | null;
        workdays: { elapsed: number; total: number };
        salesTargetUnits: number | null;
        salesTargetsMissing: number;
        teamTargetsMissing: number;
        targetAllocationDifference: number | null;
        realizationUnits: number;
        forecastUnits: number | null;
        forecastValue: number | null;
        forecastApproved: boolean;
        gapUnits: number | null;
        forecastGapUnits: number | null;
        stageCounts: Record<string, number>;
        forecastStages: ForecastStage[] | null;
        stagnantCount: number;
        missingClosingMonthCount: number;
        missingDoHistoryCount: number;
        contributors: {
            public_id: string;
            vehicle_model: string;
            stage_label: string;
            sales_name: string | null;
            url?: string | null;
            weighted_value: number;
        }[];
        performance: PerformanceRow[];
        teams: PerformanceRow[];
        unassignedTeam: Metrics | null;
        stageAchievement?: StageAchievementData | null;
        priorityTotals?: { stagnant: number; closing: number; unread: number };
        priorities: {
            stagnant: Priority[];
            closing: Priority[];
            unread: Priority[];
        };
    };
    targetPlans: TargetPlan[];
    targetableUsers: { id: number; name: string; username: string }[];
    targetableTeams: { id: string; name: string }[];
};

export function stageLabel(stage: string) {
    return (
        (
            {
                lead: 'Lead',
                prospect: 'Prospect',
                hot_prospect: 'Hot Prospect',
                spk: 'SPK',
                do: 'DO',
                lost: 'Lost',
            } as Record<string, string>
        )[stage] ?? stage
    );
}

/** Share of the month's Monday–Saturday workdays already started; null once the month is over or before it starts. */
export function paceRatio(workdays?: { elapsed: number; total: number }) {
    return workdays && workdays.total && workdays.elapsed < workdays.total
        ? workdays.elapsed / workdays.total
        : null;
}

/** Units the target expects by today, one decimal (PRD DSH-07). */
export const paceUnits = (target: number, ratio: number) =>
    Math.round(target * ratio * 10) / 10;

export const percentOf = (value: number | null, target: number | null) =>
    value == null || !target
        ? null
        : `${Math.round((value / target) * 100)}% dari target`;

export function amount(
    value: number | null | undefined,
    missing = 'Belum ditetapkan',
) {
    return value == null
        ? missing
        : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(
              value,
          );
}

export function PeriodPicker({ period }: { period: string }) {
    const form = useForm({ period: period.slice(0, 7) });
    const { url } = usePage();
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.get(url.split('?')[0], { preserveScroll: true });
            }}
            className="flex flex-wrap items-end gap-3"
        >
            <div className="grid gap-2">
                <Label htmlFor="report-period">Periode laporan</Label>
                <Input
                    id="report-period"
                    aria-invalid={!!form.errors.period}
                    aria-describedby={
                        form.errors.period ? 'report-period-error' : undefined
                    }
                    type="month"
                    required
                    value={form.data.period}
                    onChange={(e) => form.setData('period', e.target.value)}
                />
                <InputError
                    id="report-period-error"
                    message={form.errors.period}
                />
            </div>
            <Button
                type="submit"
                variant="secondary"
                disabled={form.processing}
            >
                {form.processing ? (
                    <>
                        <Spinner aria-hidden="true" />
                        Memuat
                    </>
                ) : (
                    'Tampilkan'
                )}
            </Button>
        </form>
    );
}

const percent = (weight: number) => amount(weight * 100) + '%';

export function ForecastBreakdown({
    dashboard: d,
}: {
    dashboard: ReportingProps['dashboard'];
}) {
    if (!d.forecastStages || d.forecastUnits === null) {
        return null;
    }
    const pipeline = d.forecastStages.reduce((sum, s) => sum + s.units, 0);
    const tiles = [
        ['Target', amount(d.targetUnits)],
        ['Realisasi', amount(d.realizationUnits)],
        ['+ Pipeline berbobot', amount(Math.round(pipeline * 100) / 100)],
        ['= Forecast (estimasi)', amount(d.forecastUnits)],
        ['Gap ke forecast', amount(d.forecastGapUnits, '—')],
    ];
    return (
        <section
            aria-labelledby="forecast-breakdown-title"
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
        >
            <div className="border-b p-5">
                <h2
                    id="forecast-breakdown-title"
                    className="text-base font-semibold"
                >
                    Asal forecast
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Transaksi aktif dengan estimasi closing pada periode ini,
                    dikalikan bobot peluang tahapnya.
                </p>
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
                {tiles.map(([label, value]) => (
                    <div
                        key={label}
                        className="min-w-0 rounded-lg bg-muted p-3"
                    >
                        <dt className="text-xs text-muted-foreground">
                            {label}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-y text-left text-xs text-muted-foreground">
                        <th scope="col" className="px-5 py-3 font-medium">
                            Tahap
                        </th>
                        <th
                            scope="col"
                            className="px-3 py-3 text-right font-medium"
                        >
                            Transaksi
                        </th>
                        <th
                            scope="col"
                            className="px-3 py-3 text-right font-medium"
                        >
                            Bobot
                        </th>
                        <th
                            scope="col"
                            className="px-5 py-3 text-right font-medium"
                        >
                            Unit berbobot
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {d.forecastStages.map((s) => (
                        <tr key={s.stage}>
                            <th
                                scope="row"
                                className="px-5 py-3 text-left font-medium"
                            >
                                {stageLabel(s.stage)}
                            </th>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {amount(s.count)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {percent(s.weight)}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">
                                {amount(s.units)}
                            </td>
                        </tr>
                    ))}
                    {d.missingClosingMonthCount > 0 && (
                        <tr>
                            <th
                                scope="row"
                                className="px-5 py-3 text-left font-medium"
                            >
                                Tanpa estimasi closing
                            </th>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {amount(d.missingClosingMonthCount)}
                            </td>
                            <td className="px-3 py-3 text-right">—</td>
                            <td className="px-5 py-3 text-right text-muted-foreground">
                                Tidak dihitung
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
}

function StageSummary({ row }: { row: PerformanceRow }) {
    return (
        <p className="text-xs leading-5 text-muted-foreground">
            {(row.forecast_stages ?? [])
                .map(
                    (s) =>
                        `${stageLabel(s.stage)} ${amount(s.count)} × ${percent(s.weight)} = ${amount(s.units)}`,
                )
                .join(' · ')}
            {!!row.missing_closing_month_count &&
                ` · ${row.missing_closing_month_count} tanpa estimasi closing`}
        </p>
    );
}

export function PerformanceTable({
    title,
    rows,
    team = false,
    breakdown = false,
}: {
    title: string;
    rows: PerformanceRow[];
    team?: boolean;
    breakdown?: boolean;
}) {
    const [open, setOpen] = useState<Set<PerformanceRow['id']>>(new Set());
    const toggle = (id: PerformanceRow['id']) =>
        setOpen((current) => {
            const next = new Set(current);
            if (!next.delete(id)) {
                next.add(id);
            }
            return next;
        });
    const role = usePage().props.auth.user.role;
    const showManagement =
        !team || role === 'supervisor' || role === 'branch_manager';
    const columns = [
        ...(showManagement ? [team ? 'Target tim' : 'Target personal'] : []),
        ...(team
            ? [
                  'Benchmark tim',
                  'Total alokasi Sales',
                  'Alokasi / benchmark',
                  'Alokasi aktif',
                  ...(showManagement ? ['Pencapaian management'] : []),
                  'Pencapaian benchmark',
              ]
            : []),
        'Realisasi',
        'Forecast',
        ...(showManagement ? ['Gap ke realisasi', 'Gap ke forecast'] : []),
        ...(team
            ? ['Gap benchmark ke realisasi', 'Gap benchmark ke forecast']
            : []),
    ];
    const values = (row: PerformanceRow) => [
        ...(showManagement ? [amount(row.target_units)] : []),
        ...(team
            ? [
                  amount(row.benchmark_units),
                  amount(row.sales_target_units),
                  row.allocation_percent == null
                      ? '—'
                      : amount(row.allocation_percent) + '%',
                  amount(row.active_allocation_units),
                  ...(showManagement
                      ? [
                            row.achievement_percent == null
                                ? '—'
                                : amount(row.achievement_percent) + '%',
                        ]
                      : []),
                  row.benchmark_achievement_percent == null
                      ? '—'
                      : amount(row.benchmark_achievement_percent) + '%',
              ]
            : []),
        amount(row.realization_units),
        amount(row.forecast_units, 'Tidak tersedia'),
        ...(showManagement
            ? [amount(row.gap_units, '—'), amount(row.forecast_gap_units, '—')]
            : []),
        ...(team
            ? [
                  amount(row.benchmark_gap_units, '—'),
                  amount(row.benchmark_forecast_gap_units, '—'),
              ]
            : []),
    ];
    return (
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-5">
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Semua angka dalam unit. Gap = target dikurangi realisasi
                    atau forecast; nilai negatif berarti melampaui target.
                </p>
            </div>
            {rows.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                    Belum ada data kinerja.
                </p>
            ) : (
                <>
                    <div className={team ? 'divide-y' : 'divide-y xl:hidden'}>
                        {rows.map((row) => (
                            <article className="striped-row p-5" key={row.id}>
                                <h3 className="font-medium break-words">
                                    {row.name}
                                    {row.is_active === false && (
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            (Tim nonaktif)
                                        </span>
                                    )}
                                </h3>
                                {row.is_current_member === false && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Transaksi tercatat; bukan anggota aktif
                                        tim ini
                                    </p>
                                )}
                                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {columns.map((column, i) => (
                                        <div key={column} className="min-w-0">
                                            <dt className="text-xs text-muted-foreground">
                                                {column}
                                            </dt>
                                            <dd className="mt-1 text-sm font-medium break-words tabular-nums">
                                                {values(row)[i]}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                {breakdown && row.forecast_stages && (
                                    <details className="mt-3">
                                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-primary">
                                            Rincian forecast per tahap
                                        </summary>
                                        <StageSummary row={row} />
                                    </details>
                                )}
                                {team && !!row.sales_targets_missing && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {row.sales_targets_missing} Sales belum
                                        memiliki target.
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                    <table
                        className={
                            team
                                ? 'hidden'
                                : 'hidden w-full table-fixed text-sm xl:table'
                        }
                    >
                        <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                                <th
                                    className="w-1/5 px-4 py-3 font-medium"
                                    scope="col"
                                >
                                    {team ? 'Tim' : 'Sales'}
                                </th>
                                {columns.map((c) => (
                                    <th
                                        key={c}
                                        scope="col"
                                        className="px-3 py-3 text-right font-medium break-words"
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((row) => (
                                <Fragment key={row.id}>
                                    <tr className="striped-row">
                                        <th
                                            scope="row"
                                            className="px-4 py-4 text-left font-medium break-words"
                                        >
                                            {breakdown &&
                                            row.forecast_stages ? (
                                                <button
                                                    type="button"
                                                    aria-expanded={open.has(
                                                        row.id,
                                                    )}
                                                    aria-controls={`forecast-stages-${row.id}`}
                                                    onClick={() =>
                                                        toggle(row.id)
                                                    }
                                                    className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded text-left font-medium hover:underline"
                                                >
                                                    <ChevronRight
                                                        aria-hidden="true"
                                                        className={`size-4 shrink-0 transition-transform ${open.has(row.id) ? 'rotate-90' : ''}`}
                                                    />
                                                    {row.name}
                                                    <span className="sr-only">
                                                        : rincian forecast per
                                                        tahap
                                                    </span>
                                                </button>
                                            ) : (
                                                row.name
                                            )}
                                            {row.is_active === false && (
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    (Tim nonaktif)
                                                </span>
                                            )}
                                            {row.is_current_member ===
                                                false && (
                                                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                                    Bukan anggota aktif
                                                </span>
                                            )}
                                            {team &&
                                                !!row.sales_targets_missing && (
                                                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                                        {
                                                            row.sales_targets_missing
                                                        }{' '}
                                                        target Sales belum diisi
                                                    </span>
                                                )}
                                        </th>
                                        {values(row).map((v, i) => (
                                            <td
                                                className="px-3 py-4 text-right break-words tabular-nums"
                                                key={columns[i]}
                                            >
                                                {v}
                                            </td>
                                        ))}
                                    </tr>
                                    {breakdown &&
                                        row.forecast_stages &&
                                        open.has(row.id) && (
                                            <tr
                                                id={`forecast-stages-${row.id}`}
                                                className="bg-muted/50"
                                            >
                                                <td
                                                    colSpan={columns.length + 1}
                                                    className="px-4 py-3 pl-10"
                                                >
                                                    <StageSummary row={row} />
                                                </td>
                                            </tr>
                                        )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
}

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export function PriorityLists({
    priorities,
    totals,
    hideSales = false,
}: {
    priorities: ReportingProps['dashboard']['priorities'];
    totals?: ReportingProps['dashboard']['priorityTotals'];
    hideSales?: boolean;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const groups = [
        ['stagnant', 'Transaksi stagnan'],
        ['unread', 'Komentar belum dibaca'],
        ['closing', 'Peluang closing periode ini'],
    ] as const;
    return (
        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(([key, title]) => {
                const items = priorities?.[key] ?? [];
                const total = Math.max(totals?.[key] ?? 0, items.length);
                // Phones show three; a single leftover item is shown instead of a button for it.
                const phoneCount =
                    expanded[key] || items.length <= 4 ? items.length : 3;
                const count = (shown: number) =>
                    total > shown ? `${shown} dari ${total}` : `(${shown})`;
                return (
                    <section
                        key={key}
                        className="min-w-0 overflow-hidden rounded-xl border bg-card"
                    >
                        <h3 className="border-b p-5 text-base font-semibold">
                            {title}{' '}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                                <span className="md:hidden">
                                    {count(phoneCount)}
                                </span>
                                <span className="max-md:hidden">
                                    {count(items.length)}
                                </span>
                            </span>
                        </h3>
                        {!items.length ? (
                            <p className="p-5 text-sm text-muted-foreground">
                                Tidak ada tindakan pada daftar ini.
                            </p>
                        ) : (
                            <ol className="divide-y">
                                {items.map((item, index) => {
                                    const name =
                                        item.customer_name ??
                                        item.vehicle_model ??
                                        'Transaksi';
                                    const detail = [
                                        hideSales ? null : item.sales_name,
                                        key === 'unread'
                                            ? [item.author_name, item.excerpt]
                                                  .filter(Boolean)
                                                  .join(': ')
                                            : key === 'stagnant' &&
                                                item.last_activity_at
                                              ? `Aktivitas terakhir ${formatRelativeTime(item.last_activity_at)}`
                                              : key === 'closing'
                                                ? [
                                                      item.estimated_value !=
                                                      null
                                                          ? rupiah.format(
                                                                item.estimated_value,
                                                            )
                                                          : null,
                                                      item.expected_closing_month
                                                          ? `closing ${formatMonth(item.expected_closing_month)}`
                                                          : null,
                                                  ]
                                                      .filter(Boolean)
                                                      .join(' · ')
                                                : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ');
                                    return (
                                        <li
                                            key={item.id ?? item.public_id}
                                            // Phones show three per list so the metrics stay within reach.
                                            className={`striped-row flex items-center gap-3 px-4 py-2 ${index >= phoneCount ? 'max-md:hidden' : ''}`}
                                        >
                                            <Link
                                                href={item.url}
                                                className="group grid min-h-11 min-w-0 flex-1 content-center py-1 text-sm"
                                            >
                                                <span className="truncate font-medium text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">
                                                    {name}
                                                    {item.customer_name &&
                                                        item.vehicle_model && (
                                                            <span className="font-normal text-muted-foreground">
                                                                {' · '}
                                                                {
                                                                    item.vehicle_model
                                                                }
                                                            </span>
                                                        )}
                                                </span>
                                                {detail && (
                                                    <span className="line-clamp-2 text-xs text-muted-foreground">
                                                        {detail}
                                                    </span>
                                                )}
                                            </Link>
                                            {item.stage && (
                                                <StageBadge stage={item.stage}>
                                                    {stageLabel(item.stage)}
                                                </StageBadge>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                        {/* One footer per list: the full-list link wins over showing two more. */}
                        {phoneCount < items.length &&
                            !(key === 'stagnant' && total > items.length) && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpanded({
                                            ...expanded,
                                            [key]: true,
                                        })
                                    }
                                    className="flex min-h-11 w-full items-center border-t px-5 text-sm font-medium text-primary underline-offset-4 hover:underline md:hidden"
                                >
                                    Tampilkan {items.length - phoneCount} lagi
                                </button>
                            )}
                        {key === 'stagnant' && total > items.length && (
                            <Link
                                href="/transactions?tab=stagnant&date_from=&date_to="
                                className="flex min-h-11 items-center border-t px-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Lihat semua {total} transaksi stagnan
                            </Link>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

export function ClosingMonthForm({
    transactionId,
    month,
}: {
    transactionId: string;
    month: string | null;
}) {
    const form = useForm({ expected_closing_month: month ?? '' });
    return (
        <form
            className="grid gap-3 rounded-lg border p-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    expected_closing_month: data.expected_closing_month || null,
                }));
                form.patch(`/transactions/${transactionId}/closing-month`, {
                    preserveScroll: true,
                });
            }}
        >
            <Label htmlFor={`closing-${transactionId}`}>
                Estimasi bulan closing
            </Label>
            <MonthPicker
                id={`closing-${transactionId}`}
                aria-invalid={!!form.errors.expected_closing_month}
                aria-describedby={
                    form.errors.expected_closing_month
                        ? `closing-error-${transactionId}`
                        : undefined
                }
                value={form.data.expected_closing_month}
                onChange={(month) =>
                    form.setData('expected_closing_month', month)
                }
            />
            <p className="text-xs leading-5 text-muted-foreground">
                Kosongkan jika belum diketahui. Transaksi tanpa estimasi tidak
                masuk forecast bulanan.
            </p>
            <InputError
                id={`closing-error-${transactionId}`}
                message={form.errors.expected_closing_month}
            />
            <Button
                disabled={form.processing}
                type="submit"
                variant="secondary"
                className="w-fit"
            >
                {form.processing ? 'Menyimpan…' : 'Simpan estimasi closing'}
            </Button>
            {form.recentlySuccessful && (
                <p role="status" className="text-sm text-muted-foreground">
                    Estimasi closing tersimpan.
                </p>
            )}
        </form>
    );
}

export function ReportingHeader({
    title,
    period,
}: {
    title: string;
    period: string;
}) {
    return (
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Kinerja bulanan sesuai cakupan akses Anda.
                </p>
            </div>
            <PeriodPicker key={period} period={period} />
        </header>
    );
}
