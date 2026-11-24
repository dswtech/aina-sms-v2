import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    amount,
    paceRatio,
    paceUnits,
    percentOf,
    PriorityLists,
    ReportingHeader,
    type ReportingProps,
} from '@/components/team-performance';
import { StageAchievementTable } from '@/components/stage-achievement-table';
import { formatMonth } from '@/lib/calendar';
import {
    ForecastContributors,
    PaceBadge,
    OpenSpkLink,
    PaceLine,
    PerformanceChart,
    PipelineChart,
} from '@/components/dashboard-charts';
import { monthPace } from '@/lib/dashboard-charts';

const gap = (value: number | null | undefined) =>
    value != null && value < 0
        ? [amount(-value), 'Target terlampaui']
        : [amount(value, '—')];

export default function Dashboard({
    dashboard: d,
    title = 'Dashboard penjualan',
}: ReportingProps & { title?: string }) {
    const role = usePage().props.auth.user.role;
    const canManage = role === 'supervisor';
    const canViewManagementTarget =
        role === 'supervisor' || role === 'branch_manager';
    const pace = paceRatio(d.workdays);
    const monthly = monthPace(
        d.targetUnits,
        d.realizationUnits,
        d.workdays,
        d.period,
    );
    // A single team repeats the KPI strip; its benchmark details stay on the Target page.
    const showTeams = (d.teams?.length ?? 0) !== 1 || role !== 'supervisor';
    const metrics = [
        ...(role !== 'admin'
            ? [
                  [
                      role === 'sales'
                          ? 'Target Sales'
                          : role === 'branch_manager'
                            ? 'Target cabang'
                            : 'Target tim',
                      amount(d.targetUnits),
                      pace !== null && d.targetUnits
                          ? `Seharusnya s.d. hari ini: ${amount(paceUnits(d.targetUnits, pace))}`
                          : null,
                  ],
              ]
            : []),
        [
            'Realisasi',
            amount(d.realizationUnits),
            percentOf(d.realizationUnits, d.targetUnits),
        ],
        [
            'Forecast (estimasi)',
            amount(d.forecastUnits, 'Tidak tersedia'),
            percentOf(d.forecastUnits, d.targetUnits),
        ],
        ...(role !== 'admin'
            ? [
                  ['Gap ke realisasi', ...gap(d.gapUnits)],
                  ['Gap ke forecast', ...gap(d.forecastGapUnits)],
              ]
            : []),
    ];
    return (
        <>
            <Head title={title} />
            <div className="mx-auto grid w-full max-w-screen-2xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader title={title} period={d.period} />
                {role !== 'branch_manager' && (
                    <section
                        aria-label="Prioritas tindak lanjut"
                        className="grid min-w-0 gap-4"
                    >
                        <div className="grid gap-1">
                            <h2 className="text-base font-semibold">
                                Prioritas tindak lanjut
                            </h2>
                            <p className="text-xs leading-5 text-muted-foreground">
                                Item teratas per daftar. Transaksi stagnan dan
                                komentar tidak dibatasi periode laporan.
                            </p>
                        </div>
                        <PriorityLists
                            priorities={d.priorities}
                            totals={d.priorityTotals}
                            hideSales={role === 'sales'}
                        />
                    </section>
                )}
                <section className="overflow-hidden rounded-xl border bg-card">
                    <h2 className="sr-only">Metrik utama</h2>
                    <dl
                        className={`grid grid-cols-2 gap-px bg-border ${role === 'admin' ? '' : 'md:grid-cols-3 lg:grid-cols-5'}`}
                    >
                        {metrics.map(([label, value, note]) => (
                            <div
                                key={label}
                                // Derivable from the tiles beside it; phones keep a 2×2 strip.
                                className={`min-w-0 bg-card p-4 last:odd:col-span-2 sm:p-5 lg:last:odd:col-span-1 ${label === 'Gap ke forecast' ? 'max-md:hidden' : ''}`}
                            >
                                <dt className="text-sm text-muted-foreground">
                                    {label}
                                </dt>
                                <dd className="mt-2 text-xl font-semibold break-words tabular-nums sm:mt-3 sm:text-2xl">
                                    {value}
                                </dd>
                                {note && (
                                    <dd className="mt-1 text-xs text-muted-foreground">
                                        {note}
                                    </dd>
                                )}
                            </div>
                        ))}
                    </dl>
                </section>
                <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                    {role !== 'admin' && (
                        <p data-pace-summary className="tabular-nums">
                            <PaceBadge pace={monthly} />
                            {monthly.status !== 'none' && ' Laju bulan ini: '}
                            <PaceLine pace={monthly} />
                        </p>
                    )}
                    {role !== 'admin' &&
                        monthly.status === 'none' &&
                        canManage && (
                            <Link
                                href={`/targets?period=${d.period.slice(0, 7)}`}
                                className="inline-flex w-fit items-center font-medium text-primary hover:underline pointer-coarse:min-h-11"
                            >
                                Kelola target
                            </Link>
                        )}
                    {role === 'sales' && d.performance[0] && (
                        <OpenSpkLink
                            row={d.performance[0]}
                            pace={monthly}
                            href="/transactions?tab=active&stage=spk&date_from=&date_to="
                            className="text-sm"
                        />
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
                    {d.forecastUnits === null && (
                        <p>
                            Forecast bulan lampau tidak tersedia karena snapshot
                            historis belum disimpan.
                        </p>
                    )}
                    {!d.forecastApproved && (
                        <p>Bobot forecast belum disetujui untuk production.</p>
                    )}
                    {!!d.missingClosingMonthCount && (
                        <p role="status">
                            {d.missingClosingMonthCount} transaksi aktif belum
                            memiliki estimasi bulan closing dan belum masuk
                            forecast.
                            {role !== 'branch_manager' && (
                                <Link
                                    href="/transactions?tab=active&closing_month=missing&date_from=&date_to="
                                    className="flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Lengkapi estimasi closing
                                </Link>
                            )}
                        </p>
                    )}
                    {!!d.missingDoHistoryCount && (
                        <p role="status">
                            {d.missingDoHistoryCount} transaksi DO tidak
                            memiliki riwayat DO yang sah dan belum dihitung
                            sebagai realisasi.
                        </p>
                    )}
                    <details className="group/notes">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4 shrink-0 transition-transform group-open/notes:rotate-90 motion-reduce:transition-none"
                            />
                            Cara membaca angka
                        </summary>
                        <div className="grid gap-2 pb-2 pl-6">
                            <p>
                                Gap = target dikurangi realisasi atau forecast.
                            </p>
                            <p>
                                Laju dinilai dari proyeksi akhir bulan:
                                realisasi ditambah laju saat ini dikali sisa
                                hari kerja. Sesuai laju bila proyeksi minimal
                                100% target, Sedikit tertinggal 70–99%,
                                Tertinggal di bawah 70%.
                            </p>
                            {d.forecastUnits !== null && (
                                <p>
                                    Forecast memakai kondisi pipeline terkini
                                    dan estimasi bulan closing, bukan kepastian
                                    penjualan.
                                </p>
                            )}
                            {role !== 'sales' && (
                                <p>
                                    Total target Sales:{' '}
                                    <strong className="text-foreground">
                                        {amount(d.salesTargetUnits)} unit
                                    </strong>
                                    .{' '}
                                    {canViewManagementTarget && (
                                        <>
                                            Selisih target tim − total target
                                            Sales:{' '}
                                            {amount(
                                                d.targetAllocationDifference,
                                                '—',
                                            )}{' '}
                                            unit.{' '}
                                        </>
                                    )}
                                    {canManage
                                        ? 'Benchmark dan alokasi personal tersedia di halaman Target.'
                                        : 'Benchmark dan alokasi personal tersedia pada rincian tim.'}
                                </p>
                            )}
                        </div>
                    </details>
                    {canManage && (
                        <Link
                            href={`/targets?period=${d.period.slice(0, 7)}`}
                            className="inline-flex min-h-11 w-fit items-center font-medium text-primary hover:underline"
                        >
                            Kelola target tim dan Sales
                        </Link>
                    )}
                </div>

                {/* Two independent columns: performance on the left, pipeline and contributors on the right. */}
                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-3">
                    <div className="grid min-w-0 gap-6 xl:col-span-2">
                        {role !== 'sales' && showTeams && (
                            <div className="grid min-w-0 gap-4">
                                <PerformanceChart
                                    rows={d.teams ?? []}
                                    team
                                    showTarget={canViewManagementTarget}
                                    pace={pace}
                                    workdays={d.workdays}
                                    period={d.period}
                                />
                                {role === 'branch_manager' && (
                                    <Link
                                        href={`/team-performance?period=${d.period.slice(0, 7)}`}
                                        className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
                                    >
                                        Buka Kinerja Tim
                                    </Link>
                                )}
                            </div>
                        )}
                        {!!(
                            d.unassignedTeam?.realization_units ||
                            d.unassignedTeam?.forecast_units
                        ) && (
                            <aside className="rounded-xl border bg-muted/50 p-5">
                                <h2 className="text-sm font-semibold">
                                    Transaksi tanpa tim
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Realisasi:{' '}
                                    {amount(
                                        d.unassignedTeam!.realization_units,
                                    )}{' '}
                                    unit · Forecast:{' '}
                                    {amount(
                                        d.unassignedTeam!.forecast_units,
                                        'Tidak tersedia',
                                    )}{' '}
                                    unit. Terhitung di agregat dealer, terpisah
                                    dari tim.
                                </p>
                            </aside>
                        )}
                        <PerformanceChart
                            key={d.period}
                            rows={d.performance}
                            showTarget
                            pace={pace}
                            workdays={d.workdays}
                            period={d.period}
                            defaultOrder={
                                role === 'supervisor' ||
                                role === 'branch_manager'
                                    ? 'pace'
                                    : 'realization'
                            }
                            title={
                                role === 'sales' ? 'Kinerja saya' : undefined
                            }
                            rowHref={
                                role === 'supervisor' || role === 'admin'
                                    ? (row) =>
                                          `/transactions?sales_id=${row.id}&date_from=&date_to=`
                                    : undefined
                            }
                            rowPace={role !== 'sales'}
                            nextHref={
                                role === 'branch_manager'
                                    ? undefined
                                    : (row) =>
                                          `/transactions?sales_id=${row.id}&tab=active&stage=spk&date_from=&date_to=`
                            }
                        />
                    </div>
                    <div className="grid min-w-0 gap-6">
                        <PipelineChart counts={d.stageCounts} />
                        <ForecastContributors
                            contributors={d.contributors ?? []}
                            hideSales={role === 'sales'}
                        />
                    </div>
                </div>
                {d.stageAchievement && (
                    <StageAchievementTable
                        data={d.stageAchievement}
                        caption={formatMonth(d.period)}
                    />
                )}
            </div>
        </>
    );
}
Dashboard.layout = { breadcrumbs: [{ title: 'Beranda', href: '/dashboard' }] };
