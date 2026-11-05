import { Head } from '@inertiajs/react';
import {
    PerformanceTable,
    ReportingHeader,
    TargetForm,
    type ReportingProps,
} from '@/components/team-performance';
export default function Targets({
    dashboard: d,
    targetableUsers,
    targetableTeams,
}: ReportingProps) {
    return (
        <>
            <Head title="Target" />
            <div className="mx-auto grid w-full max-w-7xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader
                    title="Target tim dan Sales"
                    period={d.period}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                    Target tim dari cabang dicatat Supervisor. Target Sales
                    ditetapkan untuk memacu kinerja anggota. Nilainya tidak
                    harus sama dan tidak dijumlahkan menjadi satu target.
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                    {d.forecastUnits === null
                        ? 'Forecast bulan lampau tidak tersedia; snapshot historis belum disimpan.'
                        : 'Forecast adalah estimasi dari pipeline terkini dan estimasi bulan closing, bukan kepastian penjualan.'}{' '}
                    {!d.forecastApproved &&
                        'Bobot belum disetujui untuk production.'}
                </p>
                <TargetForm
                    key={`team-${d.period}`}
                    kind="team"
                    options={targetableTeams}
                    period={d.period}
                />
                <TargetForm
                    key={`sales-${d.period}`}
                    kind="sales"
                    options={targetableUsers}
                    period={d.period}
                />
                <PerformanceTable
                    title="Target dan kinerja tim"
                    rows={d.teams}
                    team
                />
                <PerformanceTable
                    title="Target dan kinerja Sales"
                    rows={d.performance}
                />
            </div>
        </>
    );
}
Targets.layout = { breadcrumbs: [{ title: 'Target', href: '/targets' }] };
