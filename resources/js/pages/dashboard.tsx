import { Head, Link, usePage } from '@inertiajs/react';
import {
    amount,
    PriorityLists,
    ReportingHeader,
    type ReportingProps,
} from '@/components/team-performance';
import {
    ForecastContributors,
    PerformanceChart,
    PipelineChart,
} from '@/components/dashboard-charts';

export default function Dashboard({
    dashboard: d,
    title = 'Dashboard penjualan',
}: ReportingProps & { title?: string }) {
    const role = usePage().props.auth.user.role;
    const canManage = role === 'supervisor';
    const canViewManagementTarget =
        role === 'supervisor' || role === 'branch_manager';
    const metrics = [
        ...(role !== 'admin'
            ? [
                  [
                      role === 'sales' ? 'Target Sales' : 'Target management',
                      amount(d.targetUnits),
                  ],
              ]
            : []),
        ['Realisasi', amount(d.realizationUnits)],
        ['Forecast (estimasi)', amount(d.forecastUnits, 'Tidak tersedia')],
        ...(role !== 'admin'
            ? [
                  ['Gap ke realisasi', amount(d.gapUnits, '—')],
                  ['Gap ke forecast', amount(d.forecastGapUnits, '—')],
              ]
            : []),
    ];
    return (
        <>
            <Head title={title} />
            <div className="mx-auto grid w-full max-w-screen-2xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader title={title} period={d.period} />
                <section className="overflow-hidden rounded-xl border bg-card">
                    <h2 className="sr-only">Metrik utama</h2>
                    <dl
                        className={`grid divide-y sm:grid-cols-2 lg:divide-x lg:divide-y-0 ${role === 'admin' ? 'lg:grid-cols-2' : 'lg:grid-cols-5'}`}
                    >
                        {metrics.map(([label, value]) => (
                            <div key={label} className="min-w-0 p-5">
                                <dt className="text-sm text-muted-foreground">
                                    {label}
                                </dt>
                                <dd className="mt-3 text-2xl font-semibold break-words tabular-nums">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
                <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                    <p>
                        Gap = target dikurangi realisasi atau forecast. Nilai
                        negatif berarti target terlampaui.
                    </p>
                    {role !== 'sales' && (
                        <p>
                            Total target Sales:{' '}
                            <strong className="text-foreground">
                                {amount(d.salesTargetUnits)} unit
                            </strong>
                            .{' '}
                            {canViewManagementTarget && (
                                <>
                                    Selisih target tim − total target Sales:{' '}
                                    {amount(d.targetAllocationDifference, '—')}{' '}
                                    unit.
                                </>
                            )}
                            Benchmark dan alokasi personal tersedia pada rincian
                            tim.
                        </p>
                    )}
                    {!!d.teamTargetsMissing && role !== 'sales' && (
                        <p>
                            {d.teamTargetsMissing} target tim belum ditetapkan;
                            total target tim belum lengkap.
                        </p>
                    )}
                    {!!d.salesTargetsMissing && (
                        <p>
                            {d.salesTargetsMissing} target Sales belum
                            ditetapkan.
                        </p>
                    )}
                    <p>
                        {d.forecastUnits === null
                            ? 'Forecast bulan lampau tidak tersedia karena snapshot historis belum disimpan.'
                            : 'Forecast memakai kondisi pipeline terkini dan estimasi bulan closing, bukan kepastian penjualan.'}{' '}
                        {!d.forecastApproved &&
                            'Bobot belum disetujui untuk production.'}
                    </p>
                    {!!d.missingClosingMonthCount && (
                        <p role="status">
                            {d.missingClosingMonthCount} transaksi aktif belum
                            memiliki estimasi bulan closing dan belum masuk
                            forecast.
                        </p>
                    )}
                    {!!d.missingDoHistoryCount && (
                        <p role="status">
                            {d.missingDoHistoryCount} transaksi DO atau Delivery
                            tidak memiliki riwayat DO yang sah dan belum
                            dihitung sebagai realisasi.
                        </p>
                    )}
                    {canManage && (
                        <Link
                            href={`/targets?period=${d.period.slice(0, 7)}`}
                            className="inline-flex min-h-11 w-fit items-center font-medium text-primary hover:underline"
                        >
                            Kelola target tim dan Sales
                        </Link>
                    )}
                </div>

                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-3">
                    {role !== 'sales' ? (
                        <div className="grid min-w-0 gap-4 xl:col-span-2">
                            <PerformanceChart
                                rows={d.teams ?? []}
                                team
                                showTarget={canViewManagementTarget}
                            />
                            {d.unassignedTeam && (
                                <aside className="rounded-xl border bg-muted/50 p-5">
                                    <h2 className="text-sm font-semibold">
                                        Transaksi tanpa tim
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Realisasi:{' '}
                                        {amount(
                                            d.unassignedTeam.realization_units,
                                        )}{' '}
                                        unit · Forecast:{' '}
                                        {amount(
                                            d.unassignedTeam.forecast_units,
                                            'Tidak tersedia',
                                        )}{' '}
                                        unit. Terhitung di agregat dealer,
                                        terpisah dari tim.
                                    </p>
                                </aside>
                            )}
                        </div>
                    ) : (
                        <div className="min-w-0 xl:col-span-2">
                            <PerformanceChart
                                key={d.period}
                                rows={d.performance}
                                showTarget
                            />
                        </div>
                    )}
                    <PipelineChart counts={d.stageCounts} />
                    {role !== 'sales' && (
                        <div className="min-w-0 xl:col-span-2">
                            <PerformanceChart
                                key={d.period}
                                rows={d.performance}
                                showTarget
                            />
                        </div>
                    )}
                    <div
                        className={
                            role === 'sales'
                                ? 'min-w-0 xl:col-span-3'
                                : 'min-w-0'
                        }
                    >
                        <ForecastContributors
                            contributors={d.contributors ?? []}
                        />
                    </div>
                </div>
                {role !== 'branch_manager' && (
                    <section
                        aria-label="Prioritas tindak lanjut"
                        className="grid min-w-0 gap-4"
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h2 className="text-base font-semibold">
                                Prioritas tindak lanjut
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground">
                                {d.stagnantCount} transaksi stagnan
                            </p>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                            Setiap daftar menampilkan hingga lima tindakan
                            teratas. Jumlah di judul menunjukkan item yang
                            ditampilkan; daftar stagnan dan komentar tidak
                            dibatasi periode laporan.
                        </p>
                        <PriorityLists priorities={d.priorities} showCounts />
                    </section>
                )}
                {canManage && (
                    <Link
                        href="/targets"
                        data={{ period: d.period.slice(0, 7) }}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
                    >
                        Kelola rencana target tim dan Sales
                    </Link>
                )}
            </div>
        </>
    );
}
Dashboard.layout = { breadcrumbs: [{ title: 'Beranda', href: '/dashboard' }] };
