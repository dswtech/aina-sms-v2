import { Link, useForm, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
type PerformanceRow = Metrics & {
    id: number | string;
    name: string;
    username?: string;
    is_current_member?: boolean;
    is_active?: boolean;
    sales_target_units?: number | null;
    sales_targets_missing?: number;
    target_allocation_difference?: number | null;
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
        : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
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

export function TargetForm({
    kind,
    options,
    period,
}: {
    kind: 'sales' | 'team';
    options: { id: number | string; name: string; username?: string }[];
    period: string;
}) {
    const form = useForm({
        recipient: String(options[0]?.id ?? ''),
        period: period.slice(0, 7),
        target_units: '',
        target_value: '',
    });
    const label = kind === 'team' ? 'tim' : 'Sales';
    const id = (suffix: string) => `target-${kind}-${suffix}`;
    return (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold">Tetapkan target {label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
                {kind === 'team'
                    ? 'Target dari cabang dicatat Supervisor. Terpisah dari total target Sales.'
                    : 'Target motivasi setiap Sales untuk periode bulanan.'}
            </p>
            {options.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                    Belum ada {label} aktif yang dapat diberi target.
                </p>
            ) : (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(({ recipient, ...data }) => ({
                            ...data,
                            [kind === 'team' ? 'team_id' : 'user_id']:
                                recipient,
                            target_value: data.target_value || null,
                        }));
                        form.post(
                            kind === 'team' ? '/team-targets' : '/targets',
                            {
                                preserveScroll: true,
                                onSuccess: () =>
                                    form.reset('target_units', 'target_value'),
                            },
                        );
                    }}
                    className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor={id('recipient')}>
                            {kind === 'team' ? 'Tim' : 'Sales'}
                        </Label>
                        <Combobox
                            placeholder={
                                kind === 'team' ? 'Pilih tim' : 'Pilih sales'
                            }
                            searchPlaceholder={
                                kind === 'team'
                                    ? 'Cari tim...'
                                    : 'Cari sales...'
                            }
                            id={id('recipient')}
                            aria-label={
                                kind === 'team'
                                    ? 'Tim penerima target'
                                    : 'Sales'
                            }
                            value={form.data.recipient}
                            onValueChange={(value) =>
                                form.setData('recipient', value)
                            }
                            options={options.map((o) => ({
                                value: String(o.id),
                                label: o.name,
                                hint: o.username ? `@${o.username}` : undefined,
                            }))}
                        />
                        <InputError
                            message={
                                (form.errors as Record<string, string>)[
                                    kind === 'team' ? 'team_id' : 'user_id'
                                ]
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={id('period')}>
                            Periode target {label}
                        </Label>
                        <Input
                            id={id('period')}
                            aria-invalid={!!form.errors.period}
                            aria-describedby={
                                form.errors.period
                                    ? id('period-error')
                                    : undefined
                            }
                            type="month"
                            value={form.data.period}
                            required
                            onChange={(e) =>
                                form.setData('period', e.target.value)
                            }
                        />
                        <InputError
                            id={id('period-error')}
                            message={form.errors.period}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={id('units')}>
                            Target unit{kind === 'team' ? ' tim' : ''}
                        </Label>
                        <Input
                            id={id('units')}
                            aria-invalid={!!form.errors.target_units}
                            aria-describedby={
                                form.errors.target_units
                                    ? id('units-error')
                                    : undefined
                            }
                            type="number"
                            min="0"
                            max="10000"
                            required
                            value={form.data.target_units}
                            onChange={(e) =>
                                form.setData('target_units', e.target.value)
                            }
                        />
                        <InputError
                            id={id('units-error')}
                            message={form.errors.target_units}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={id('value')}>
                            Nilai target (Rp){kind === 'team' ? ' tim' : ''}
                        </Label>
                        <Input
                            id={id('value')}
                            aria-invalid={!!form.errors.target_value}
                            aria-describedby={
                                form.errors.target_value
                                    ? id('value-error')
                                    : undefined
                            }
                            type="number"
                            min="0"
                            value={form.data.target_value}
                            onChange={(e) =>
                                form.setData('target_value', e.target.value)
                            }
                        />
                        <InputError
                            id={id('value-error')}
                            message={form.errors.target_value}
                        />
                    </div>
                    <Button
                        className="md:col-span-2 md:w-fit xl:col-span-4"
                        disabled={form.processing}
                        type="submit"
                    >
                        {form.processing
                            ? 'Menyimpan…'
                            : `Simpan target ${label}`}
                    </Button>
                </form>
            )}
        </section>
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
    const columns = [
        'Target',
        ...(team ? ['Total target Sales', 'Selisih target tim − Sales'] : []),
        'Realisasi',
        'Forecast',
        'Gap ke realisasi',
        'Gap ke forecast',
    ];
    const values = (row: PerformanceRow) => [
        amount(row.target_units),
        ...(team
            ? [
                  amount(row.sales_target_units),
                  amount(row.target_allocation_difference, '—'),
              ]
            : []),
        amount(row.realization_units),
        amount(row.forecast_units, 'Tidak tersedia'),
        amount(row.gap_units, '—'),
        amount(row.forecast_gap_units, '—'),
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
                    <div className="divide-y xl:hidden">
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
                                <dl className="mt-4 grid grid-cols-2 gap-4">
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
                    <table className="hidden w-full table-fixed text-sm xl:table">
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
}: {
    priorities: ReportingProps['dashboard']['priorities'];
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
