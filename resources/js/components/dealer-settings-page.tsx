import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** Shared frame for the Pengaturan Dealer sub-pages (one page per sidebar submenu). */
export function DealerSettingsPage({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <>
            <Head title={`${title} · Pengaturan Dealer`} />
            <div className="mx-auto w-full max-w-5xl space-y-6 px-5 pt-8 pb-28 sm:px-8">
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-sm text-muted-foreground">
                    Perubahan master berlaku untuk transaksi berikutnya.
                    Snapshot DO yang sudah tercatat tidak ditulis ulang.
                </p>
                {children}
            </div>
        </>
    );
}
