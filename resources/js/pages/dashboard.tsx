import { Head, Link, usePage } from '@inertiajs/react';
import {
    amount,
    stageLabel,
    PerformanceTable,
    PriorityLists,
    ReportingHeader,
    TargetForm,
    type ReportingProps,
} from '@/components/team-performance';
import { StageBadge } from '@/components/stage-badge';

export default function Dashboard({
    dashboard: d,
    targetableUsers,
    title = 'Dashboard penjualan',
}: ReportingProps & { title?: string }) {
    const role = usePage().props.auth.user.role;
    const canManage = role === 'supervisor' || role === 'admin';
    const metrics = [
        [
            role === 'sales' ? 'Target Sales' : 'Target tim',
            amount(d.targetUnits),
        ],
        ['Realisasi', amount(d.realizationUnits)],
        ['Forecast (estimasi)', amount(d.forecastUnits, 'Tidak tersedia')],
        ['Gap ke realisasi', amount(d.gapUnits, '—')],
        ['Gap ke forecast', amount(d.forecastGapUnits, '—')],
    ];
    return (
        <>
            <Head title={title} />
            <div className="mx-auto grid w-full max-w-7xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader title={title} period={d.period} />
                <section className="overflow-hidden rounded-xl border bg-card">
                    <h2 className="sr-only">Metrik utama</h2>
                    <dl className="grid divide-y sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
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
                            . Selisih target tim − total target Sales:{' '}
                            {amount(d.targetAllocationDifference, '—')} unit.
                            Keduanya ditetapkan terpisah.
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
                    {!!d.missingDeliveryHistoryCount && (
                        <p role="status">
                            {d.missingDeliveryHistoryCount} transaksi Delivery
                            tidak memiliki riwayat tanggal Delivery; belum
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

                {role !== 'sales' && (
                    <PerformanceTable
                        title="Kinerja per tim"
                        rows={d.teams ?? []}
                        team
                    />
                )}
                <PerformanceTable
                    title="Kinerja per Sales"
                    rows={d.performance}
                />
                {d.unassignedTeam && (
                    <section className="rounded-xl border bg-card p-5">
                        <h2 className="font-semibold">Transaksi tanpa tim</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Realisasi:{' '}
                            {amount(d.unassignedTeam.realization_units)} unit ·
                            Forecast:{' '}
                            {amount(
                                d.unassignedTeam.forecast_units,
                                'Tidak tersedia',
                            )}{' '}
                            unit. Terhitung di agregat dealer, terpisah dari
                            tim.
                        </p>
                    </section>
                )}
                <section className="rounded-xl border bg-card p-5">
                    <h2 className="font-semibold">
                        Pipeline per tahap — periode terpilih
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Tahap saat ini dengan estimasi closing atau kejadian
                        tahap pada periode ini. Delivery dihitung dari riwayat
                        penyerahan.
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                        {Object.entries(d.stageCounts).map(([stage, count]) => (
                            <div key={stage}>
                                <dt>
                                    <StageBadge stage={stage}>
                                        {stageLabel(stage)}
                                    </StageBadge>
                                </dt>
                                <dd className="mt-2 text-xl font-semibold tabular-nums">
                                    {count}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
                <section className="overflow-hidden rounded-xl border bg-card">
                    <h2 className="border-b p-5 text-base font-semibold">
                        Kontributor forecast teratas
                    </h2>
                    <p className="px-5 pt-4 text-xs text-muted-foreground">
                        Kontribusi nilai berbobot pada estimasi bulan closing
                        terpilih, bukan kepastian penjualan.
                    </p>
                    {!d.contributors?.length ? (
                        <p className="p-5 text-sm text-muted-foreground">
                            Tidak ada kontributor forecast pada periode ini.
                        </p>
                    ) : (
                        <ol className="mt-4 divide-y">
                            {d.contributors.map((c) => (
                                <li
                                    className="striped-row flex flex-wrap items-center justify-between gap-3 p-5"
                                    key={c.public_id}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium break-words">
                                            {c.vehicle_model}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <StageBadge stage={c.stage_label}>
                                                {c.stage_label}
                                            </StageBadge>
                                            <span className="text-xs text-muted-foreground">
                                                {c.sales_name}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium tabular-nums">
                                        {new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            maximumFractionDigits: 0,
                                        }).format(c.weighted_value)}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
                {role !== 'branch_manager' && (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {d.stagnantCount} transaksi stagnan pada pipeline
                            saat ini. Setiap daftar menampilkan hingga lima
                            tindakan teratas; daftar stagnan dan komentar tidak
                            dibatasi periode laporan.
                        </p>
                        <PriorityLists priorities={d.priorities} />
                    </>
                )}
                {canManage && (
                    <TargetForm
                        key={d.period}
                        kind="sales"
                        options={targetableUsers}
                        period={d.period}
                    />
                )}
            </div>
        </>
    );
}
Dashboard.layout = { breadcrumbs: [{ title: 'Beranda', href: '/dashboard' }] };
