import { Head } from '@inertiajs/react';
import {
    AreaReport,
    type AreaReportData,
} from '@/components/mapping-area/report';

export default function MappingAreaPage({
    report,
}: {
    report: AreaReportData;
}) {
    return (
        <>
            <Head title="Mapping Area" />
            <div className="mx-auto w-full max-w-screen-2xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Mapping Area
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Penjualan DO berdasarkan kecamatan FOA dan area lain.
                    </p>
                </header>
                <AreaReport result={report} />
            </div>
        </>
    );
}
