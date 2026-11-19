import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { FilterPanel } from '@/components/filter-panel';
import { MonthRangeFields } from '@/components/month-range-fields';
import {
    StageAchievementTable,
    type StageAchievementData,
} from '@/components/stage-achievement-table';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';

export default function StageAchievementPage({
    report,
}: {
    report: StageAchievementData & { from: string; to: string };
}) {
    const [from, setFrom] = useState(report.from);
    const [to, setTo] = useState(report.to);
    const periodLabel = formatMonthRange(report.from, report.to);
    return (
        <>
            <Head title="Capaian Sales" />
            <div className="mx-auto w-full max-w-screen-2xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Capaian Sales
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Jumlah transaksi per tahap yang dicapai setiap Sales,
                        berdasarkan tanggal tahap sah.
                    </p>
                </header>
                <div className="space-y-6">
                    <FilterPanel
                        iconOnly
                        title="Filter Capaian Sales"
                        summary={periodLabel}
                    >
                        <MonthRangeFields
                            id="stage-achievement-period"
                            from={from}
                            to={to}
                            onChange={(start, end) => {
                                setFrom(start);
                                setTo(end);
                                if (!monthRangeError(start, end))
                                    router.get(
                                        '/analytics/stage-achievement',
                                        { from: start, to: end },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    );
                            }}
                        />
                    </FilterPanel>
                    <StageAchievementTable data={report} />
                </div>
            </div>
        </>
    );
}
