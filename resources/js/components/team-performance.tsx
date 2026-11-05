import type { TargetPlan } from '@/components/target-plan-editor';
import { Link, useForm, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type Metrics = {
    target_units: number | null;
    realization_units: number;
    forecast_units: number | null;
    gap_units: number | null;
    forecast_gap_units: number | null;
    missing_closing_month_count?: number;
    missing_delivery_history_count?: number;
};
export type PerformanceRow = Metrics & {
    id: number | string;
    name: string;
    username?: string;
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
    title?: string;
    vehicle_model?: string;
    sales_name?: string;
    stage?: string;
    url: string;
};
export type ReportingProps = {
    dashboard: {
        period: string;
        targetUnits: number | null;
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
        stagnantCount: number;
        missingClosingMonthCount: number;
        missingDeliveryHistoryCount: number;
        contributors: {
            public_id: string;
            vehicle_model: string;
            stage_label: string;
            sales_name: string | null;
            weighted_value: number;
        }[];
        performance: PerformanceRow[];
        teams: PerformanceRow[];
        unassignedTeam: Metrics | null;
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
                delivery: 'Delivery',
                lost: 'Lost',
            } as Record<string, string>
        )[stage] ?? stage
    );
}

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
                Tampilkan
            </Button>
        </form>
    );
}

export function PerformanceTable({
    title,
    rows,
    team = false,
}: {
    title: string;
    rows: PerformanceRow[];
    team?: boolean;
}) {
    const role = usePage().props.auth.user.role;
    const showManagement =
        !team || role === 'supervisor' || role === 'branch_manager';
    const columns = [
        ...(showManagement
            ? [team ? 'Target management' : 'Target personal']
            : []),
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
                                <tr className="striped-row" key={row.id}>
                                    <th
                                        scope="row"
                                        className="px-4 py-4 text-left font-medium break-words"
                                    >
                                        {row.name}
                                        {row.is_active === false && (
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                (Tim nonaktif)
                                            </span>
                                        )}
                                        {row.is_current_member === false && (
                                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                                Bukan anggota aktif
                                            </span>
                                        )}
                                        {team &&
                                            !!row.sales_targets_missing && (
                                                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                                    {row.sales_targets_missing}{' '}
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
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
}

export function PriorityLists({
    priorities,
    showCounts = false,
}: {
    priorities: ReportingProps['dashboard']['priorities'];
    showCounts?: boolean;
}) {
    const groups = [
        ['stagnant', 'Transaksi stagnan'],
        ['unread', 'Komentar belum dibaca'],
        ['closing', 'Peluang closing periode ini'],
    ] as const;
    return (
        <div className="grid min-w-0 gap-5 lg:grid-cols-3">
            {groups.map(([key, title]) => (
                <section
                    key={key}
                    className="min-w-0 overflow-hidden rounded-xl border bg-card"
                >
                    <h2 className="border-b p-5 text-base font-semibold">
                        {title}
                        {showCounts && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({priorities?.[key]?.length ?? 0})
                            </span>
                        )}
                    </h2>
                    {!priorities?.[key]?.length ? (
                        <p className="p-5 text-sm text-muted-foreground">
                            Tidak ada tindakan pada daftar ini.
                        </p>
                    ) : (
                        <ol className="divide-y">
                            {priorities[key].map((item) => (
                                <li
                                    key={item.id ?? item.public_id}
                                    className="striped-row p-5"
                                >
                                    <Link
                                        href={item.url}
                                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        {item.title ?? item.vehicle_model}
                                    </Link>
                                    {item.stage && (
                                        <div className="mt-2">
                                            <StageBadge stage={item.stage}>
                                                {stageLabel(item.stage)}
                                            </StageBadge>
                                        </div>
                                    )}
                                    {item.sales_name && (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {item.sales_name}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            ))}
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
            <Input
                id={`closing-${transactionId}`}
                aria-invalid={!!form.errors.expected_closing_month}
                aria-describedby={
                    form.errors.expected_closing_month
                        ? `closing-error-${transactionId}`
                        : undefined
                }
                type="month"
                value={form.data.expected_closing_month}
                onChange={(e) =>
                    form.setData('expected_closing_month', e.target.value)
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
