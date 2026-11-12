import { Head } from '@inertiajs/react';
import { TargetPlanEditor } from '@/components/target-plan-editor';
import {
    ReportingHeader,
    type ReportingProps,
} from '@/components/team-performance';

export default function TargetPlans({
    dashboard: d,
    targetPlans,
}: ReportingProps) {
    return (
        <>
            <Head title="Rencana Target Bulanan" />
            <div className="mx-auto grid w-full max-w-screen-2xl min-w-0 flex-1 content-start gap-6 px-5 pt-8 pb-28 sm:px-8 md:pb-12 lg:px-10">
                <ReportingHeader
                    title="Rencana target bulanan"
                    period={d.period}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                    Target management dicatat SPV, kemudian ditambah markup
                    menjadi benchmark tim. Target personal dapat disesuaikan
                    dengan total alokasi minimal 100% dari benchmark.
                </p>
                <TargetPlanEditor key={d.period} plans={targetPlans} />
            </div>
        </>
    );
}
TargetPlans.layout = {
    breadcrumbs: [
        { title: 'Target', href: '/targets' },
        { title: 'Rencana Target Bulanan', href: '/targets/plans' },
    ],
};
