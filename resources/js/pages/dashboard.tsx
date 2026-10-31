import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { roleLabels } from '@/lib/navigation';
import { dashboard as dashboardRoute } from '@/routes';

type Contributor = {
    public_id: string;
    vehicle_model: string;
    stage_label: string;
    sales_name: string | null;
    weighted_value: number;
};

type SalesPerformance = {
    id: number;
    name: string;
    username: string;
    target_units: number;
    realization_units: number;
    gap_units: number;
};

type DashboardData = {
    period: string;
    targetUnits: number;
    realizationUnits: number;
    forecastUnits: number;
    forecastValue: number;
    forecastApproved: boolean;
    gapUnits: number;
    stageCounts: Record<string, number>;
    stagnantCount: number;
    contributors: Contributor[];
    performance: SalesPerformance[];
};

type TargetableUser = {
    id: number;
    name: string;
    username: string;
};

type PageProps = {
    dashboard: DashboardData;
    targetableUsers: TargetableUser[];
};

const stageLabels: Record<string, string> = {
    lead: 'Lead',
    prospect: 'Prospect',
    hot_prospect: 'Hot Prospect',
    spk: 'SPK',
    do: 'DO',
    delivery: 'Delivery',
    lost: 'Lost',
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 1,
});

const periodFormatter = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
});

function formatPeriod(period: string) {
    const [year, month] = period.split('-').map(Number);

    return periodFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function TargetForm({
    users,
    period,
}: {
    users: TargetableUser[];
    period: string;
}) {
    const [userId, setUserId] = useState(users[0]?.id.toString() ?? '');
    const [targetPeriod, setTargetPeriod] = useState(period.slice(0, 7));
    const [targetUnits, setTargetUnits] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.post(
            '/targets',
            {
                user_id: userId,
                period: targetPeriod,
                target_units: targetUnits,
                target_value: targetValue || null,
            },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onError: (validationErrors) => setErrors(validationErrors),
                onSuccess: () => {
                    setErrors({});
                    setTargetUnits('');
                    setTargetValue('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
            <div>
                <h2 className="text-base font-semibold">
                    Tetapkan target Sales
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Target disimpan per Sales dan periode bulanan.
                </p>
            </div>

            {users.length === 0 ? (
                <p className="mt-5 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
                    Belum ada Sales aktif yang dapat diberi target.
                </p>
            ) : (
                <form
                    onSubmit={submit}
                    className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="target-user">Sales</Label>
                        <select
                            id="target-user"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            required
                        >
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} (@{user.username})
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.user_id} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="target-period">Periode</Label>
                        <Input
                            id="target-period"
                            type="month"
                            value={targetPeriod}
                            onChange={(event) =>
                                setTargetPeriod(event.target.value)
                            }
                            className="h-11"
                            required
                        />
                        <InputError message={errors.period} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="target-units">Target unit</Label>
                        <Input
                            id="target-units"
                            type="number"
                            min="0"
                            max="10000"
                            inputMode="numeric"
                            value={targetUnits}
                            onChange={(event) =>
                                setTargetUnits(event.target.value)
                            }
                            className="h-11"
                            placeholder="Contoh: 10"
                            required
                        />
                        <InputError message={errors.target_units} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor="target-value">Nilai target (Rp)</Label>
                        <Input
                            id="target-value"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={targetValue}
                            onChange={(event) =>
                                setTargetValue(event.target.value)
                            }
                            className="h-11"
                            placeholder="Opsional"
                        />
                        <InputError message={errors.target_value} />
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="md:col-span-2 md:w-fit xl:col-span-4"
                    >
                        {processing ? 'Menyimpan…' : 'Simpan target'}
                    </Button>
                </form>
            )}
        </section>
    );
}

function Performance({ rows }: { rows: SalesPerformance[] }) {
    return (
        <section className="min-w-0 rounded-xl border bg-card">
            <div className="border-b px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold">Kinerja per Sales</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Target, realisasi, dan gap pada periode yang sama.
                </p>
            </div>

            {rows.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground sm:p-6">
                    Belum ada data kinerja Sales untuk periode ini.
                </p>
            ) : (
                <>
                    <div className="divide-y md:hidden">
                        {rows.map((row) => (
                            <article key={row.id} className="p-5">
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold">
                                        {row.name}
                                    </h3>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        @{row.username}
                                    </p>
                                </div>
                                <dl className="mt-4 grid grid-cols-3 gap-3">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Target
                                        </dt>
                                        <dd className="mt-1 font-semibold tabular-nums">
                                            {row.target_units}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Realisasi
                                        </dt>
                                        <dd className="mt-1 font-semibold tabular-nums">
                                            {row.realization_units}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Gap
                                        </dt>
                                        <dd className="mt-1 font-semibold tabular-nums">
                                            {row.gap_units}
                                        </dd>
                                    </div>
                                </dl>
                            </article>
                        ))}
                    </div>

                    <div className="hidden overflow-hidden md:block">
                        <table className="w-full table-fixed text-left text-sm">
                            <thead className="bg-secondary text-xs text-muted-foreground">
                                <tr>
                                    <th
                                        scope="col"
                                        className="w-2/5 px-6 py-3 font-medium"
                                    >
                                        Sales
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 text-right font-medium"
                                    >
                                        Target
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 text-right font-medium"
                                    >
                                        Realisasi
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-right font-medium"
                                    >
                                        Gap
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <th
                                            scope="row"
                                            className="px-6 py-4 font-medium"
                                        >
                                            <span className="block truncate">
                                                {row.name}
                                            </span>
                                            <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                                                @{row.username}
                                            </span>
                                        </th>
                                        <td className="px-4 py-4 text-right tabular-nums">
                                            {row.target_units}
                                        </td>
                                        <td className="px-4 py-4 text-right tabular-nums">
                                            {row.realization_units}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium tabular-nums">
                                            {row.gap_units}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

export default function Dashboard({ dashboard, targetableUsers }: PageProps) {
    const { auth } = usePage().props;
    const role = auth.user.role;
    const canManageTargets = role === 'supervisor' || role === 'admin';
    const stageCounts = Object.entries(dashboard.stageCounts);
    const metrics = [
        {
            label: 'Target',
            value: dashboard.targetUnits,
            note: 'unit periode ini',
        },
        {
            label: 'Realisasi',
            value: dashboard.realizationUnits,
            note: 'unit sudah tercapai',
        },
        {
            label: 'Forecast (estimasi)',
            value: dashboard.forecastUnits,
            note: `${currencyFormatter.format(dashboard.forecastValue)} nilai berbobot`,
            forecast: true,
        },
        {
            label: 'Gap',
            value: dashboard.gapUnits,
            note:
                dashboard.gapUnits > 0
                    ? 'unit menuju target'
                    : 'target tercapai atau terlampaui',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-5 pt-8 pb-12 sm:px-8 sm:pt-10 lg:px-10">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                {roleLabels[role]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {formatPeriod(dashboard.period)}
                            </span>
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                            Dashboard penjualan
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                            Ringkasan pencapaian dan pipeline sesuai cakupan
                            akses Anda.
                        </p>
                    </div>
                </header>

                <section className="mt-8 overflow-hidden rounded-xl border bg-card">
                    <h2 className="sr-only">Metrik utama</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <article
                                key={metric.label}
                                className={`min-w-0 p-5 sm:p-6 ${
                                    index < metrics.length - 1
                                        ? 'border-b sm:border-r sm:odd:border-r sm:even:border-r-0 lg:border-r lg:border-b-0 lg:even:border-r'
                                        : ''
                                } ${index === 1 ? 'lg:border-b-0' : ''}`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-sm font-medium text-muted-foreground">
                                        {metric.label}
                                    </h2>
                                    {metric.forecast &&
                                        !dashboard.forecastApproved && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                                                <AlertTriangle
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                Bobot belum disetujui
                                            </span>
                                        )}
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
                                    {numberFormatter.format(metric.value)}
                                </p>
                                <p className="mt-1 text-xs leading-5 break-words text-muted-foreground">
                                    {metric.note}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                {canManageTargets && (
                    <div className="mt-6">
                        <TargetForm
                            users={targetableUsers}
                            period={dashboard.period}
                        />
                    </div>
                )}

                <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <Performance rows={dashboard.performance} />

                    <div className="grid min-w-0 content-start gap-6">
                        <section className="rounded-xl border bg-card p-5 sm:p-6">
                            <h2 className="text-base font-semibold">
                                Pipeline per tahap
                            </h2>
                            {stageCounts.length === 0 ? (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Belum ada transaksi pada periode ini.
                                </p>
                            ) : (
                                <dl className="mt-4 grid grid-cols-2 gap-3">
                                    {stageCounts.map(([stage, count]) => (
                                        <div
                                            key={stage}
                                            className="min-w-0 rounded-lg bg-secondary p-3"
                                        >
                                            <dt className="truncate text-xs text-muted-foreground">
                                                {stageLabels[stage] ?? stage}
                                            </dt>
                                            <dd className="mt-1 text-xl font-semibold tabular-nums">
                                                {count}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </section>

                        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle
                                    aria-hidden="true"
                                    className="mt-0.5 size-5 shrink-0 text-amber-700"
                                />
                                <div>
                                    <h2 className="font-semibold text-amber-950">
                                        Transaksi stagnan
                                    </h2>
                                    <p className="mt-2 text-3xl font-semibold text-amber-950 tabular-nums">
                                        {dashboard.stagnantCount}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-amber-900">
                                        transaksi aktif tanpa aktivitas lebih
                                        dari tiga hari.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <section className="mt-6 overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-5 py-4 sm:px-6">
                        <h2 className="text-base font-semibold">
                            Kontributor forecast teratas
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Nilai berbobot adalah estimasi, bukan kepastian
                            penjualan.
                        </p>
                    </div>
                    {dashboard.contributors.length === 0 ? (
                        <p className="p-5 text-sm text-muted-foreground sm:p-6">
                            Belum ada transaksi aktif yang berkontribusi pada
                            forecast.
                        </p>
                    ) : (
                        <ol className="divide-y">
                            {dashboard.contributors.map((contributor) => (
                                <li
                                    key={contributor.public_id}
                                    className="grid min-w-0 gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {contributor.vehicle_model}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary">
                                                {contributor.stage_label}
                                            </Badge>
                                            <span>
                                                {contributor.sales_name ??
                                                    'Sales belum ditetapkan'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-xs text-muted-foreground">
                                            Estimasi berbobot
                                        </p>
                                        <p className="mt-1 text-sm font-semibold tabular-nums">
                                            {currencyFormatter.format(
                                                contributor.weighted_value,
                                            )}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </main>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Beranda',
            href: dashboardRoute(),
        },
    ],
};
