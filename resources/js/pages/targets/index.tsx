import { Head } from '@inertiajs/react';
import {
    ForecastBreakdown,
    PerformanceTable,
    ReportingHeader,
    type ReportingProps,
} from '@/components/team-performance';
export default function Targets({ dashboard: d }: ReportingProps) {
    return (
        <>
            <Head title="Target" />
            <div className="mx-auto grid w-full max-w-screen-2xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader
                    title="Target tim dan Sales"
                    period={d.period}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                    {d.forecastUnits === null
                        ? 'Forecast bulan lampau tidak tersedia; snapshot historis belum disimpan.'
                        : 'Forecast adalah estimasi dari pipeline terkini dan estimasi bulan closing, bukan kepastian penjualan.'}{' '}
                    {!d.forecastApproved &&
                        'Bobot belum disetujui untuk production.'}
                </p>
                <ForecastBreakdown dashboard={d} />
                <PerformanceTable
                    title="Target dan kinerja tim"
                    rows={d.teams}
                    team
                />
                <PerformanceTable
                    title="Target dan kinerja Sales"
                    rows={d.performance}
                    breakdown
                />
            </div>
        </>
    );
}
Targets.layout = {
    breadcrumbs: [
        { title: 'Target', href: '/targets' },
        { title: 'Target & Forecast', href: '/targets' },
    ],
};
