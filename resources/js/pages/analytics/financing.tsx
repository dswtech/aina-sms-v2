import { Head } from '@inertiajs/react';
import {
    FinancingReport,
    type FinancingReportData,
} from '@/components/financing-preview/report';

export default function FinancingPage({
    report,
}: {
    report: FinancingReportData;
}) {
    return (
        <>
            <Head title="Pembiayaan" />
            <div className="mx-auto w-full max-w-screen-2xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Pembiayaan
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Arah pembiayaan pelanggan dan kontribusi leasing, dari
                        prospek hingga realisasi penjualan.
                    </p>
                </header>
                <FinancingReport report={report} />
            </div>
        </>
    );
}
