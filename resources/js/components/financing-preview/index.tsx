import { Head, usePage } from '@inertiajs/react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { initialLeasing, syntheticDeals } from '@/lib/financing-preview';
import type { FinancingDeal, Leasing } from '@/lib/financing-preview';
import { FinancingForm, LeasingDirectory } from './editors';
import { FinancingReport } from './report';

export default function FinancingPreview() {
    const page = usePage();
    const { auth } = page.props;
    const isAdmin = auth.user.role === 'admin';
    const [screen, setScreen] = useState<'report' | 'leasing' | 'form'>(() =>
        new URLSearchParams(page.url.split('?')[1] ?? '').get('screen') ===
            'leasing' && isAdmin
            ? 'leasing'
            : 'report',
    );
    const [lenders, setLenders] = useState<Leasing[]>(initialLeasing);
    const [deals, setDeals] = useState<FinancingDeal[]>(syntheticDeals);
    const [revision, setRevision] = useState(0);
    const [notice, setNotice] = useState('');
    const tabs = [
        { id: 'report' as const, title: 'Laporan pembiayaan' },
        ...(isAdmin
            ? [{ id: 'leasing' as const, title: 'Daftar leasing' }]
            : []),
        ...(auth.user.role !== 'branch_manager'
            ? [{ id: 'form' as const, title: 'Form transaksi' }]
            : []),
    ];
    return (
        <>
            <Head title="Preview Pembiayaan" />
            <div className="mx-auto w-full max-w-7xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-xs leading-5 text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <FlaskConical
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            <strong className="text-foreground">
                                Data contoh.
                            </strong>{' '}
                            Preview frontend dengan 160 transaksi sintetis,
                            bukan data dealer.
                        </span>
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            setLenders(initialLeasing);
                            setDeals(syntheticDeals);
                            setRevision((value) => value + 1);
                            setNotice(
                                'Seluruh perubahan preview dikembalikan ke data contoh awal.',
                            );
                        }}
                    >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Reset preview
                    </Button>
                </div>
                <header className="mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Pembiayaan
                        </h1>
                        <Badge variant="secondary">Preview</Badge>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Lihat arah pembiayaan pelanggan dan kontribusi leasing,
                        dari prospek hingga realisasi penjualan.
                    </p>
                </header>
                {tabs.length > 1 && (
                    <nav
                        aria-label="Layar preview pembiayaan"
                        className="mb-6 flex flex-wrap gap-2"
                    >
                        {tabs.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={
                                    screen === tab.id ? 'secondary' : 'ghost'
                                }
                                size="sm"
                                aria-pressed={screen === tab.id}
                                onClick={() => {
                                    setScreen(tab.id);
                                    setNotice('');
                                }}
                            >
                                {tab.title}
                            </Button>
                        ))}
                    </nav>
                )}
                {notice && (
                    <p role="status" className="mb-5 text-sm text-primary">
                        {notice}
                    </p>
                )}
                <div key={revision}>
                    <div hidden={screen !== 'report'}>
                        <FinancingReport
                            deals={deals}
                            lenders={lenders}
                            onTryForm={
                                auth.user.role === 'branch_manager'
                                    ? undefined
                                    : () => setScreen('form')
                            }
                        />
                    </div>
                    {screen === 'leasing' && isAdmin && (
                        <LeasingDirectory
                            lenders={lenders}
                            onSave={(lender) => {
                                setLenders((rows) =>
                                    rows.some((row) => row.id === lender.id)
                                        ? rows.map((row) =>
                                              row.id === lender.id
                                                  ? lender
                                                  : row,
                                          )
                                        : [...rows, lender],
                                );
                                setNotice(
                                    'Daftar leasing contoh diperbarui sementara. Perubahan juga terlihat pada laporan Prospek.',
                                );
                            }}
                        />
                    )}
                    {screen === 'form' &&
                        auth.user.role !== 'branch_manager' && (
                            <FinancingForm
                                deals={deals}
                                lenders={lenders}
                                onSave={(deal) =>
                                    setDeals((rows) =>
                                        rows.map((row) =>
                                            row.id === deal.id ? deal : row,
                                        ),
                                    )
                                }
                            />
                        )}
                </div>
                <p className="mt-8 border-t pt-4 text-xs leading-5 text-muted-foreground">
                    Semua perubahan hanya berlaku selama halaman ini terbuka.
                    Ekspor dan penyimpanan ke server belum tersedia pada
                    preview.
                </p>
            </div>
        </>
    );
}
