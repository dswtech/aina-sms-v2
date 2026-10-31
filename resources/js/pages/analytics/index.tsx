import { Head, router } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type AnalyticsMode = 'acquisition' | 'achievement';
type AnalyticsDimension = 'source' | 'model';

type SourceRow = {
    source: string;
    total: number;
    share: number;
    spk: number;
    do: number;
    delivery: number;
    conversion: number | null;
};

type ModelRow = {
    model: string;
    total: number;
    share: number;
    spk: number;
    do: number;
    delivery: number;
};

type DrilldownRow = {
    public_id: string;
    vehicle_model: string;
    source: string;
    stage: string;
    stage_label: string;
    sales_name: string | null;
    created_at: string;
};

type Analytics = {
    period: string;
    mode: AnalyticsMode;
    dimension: AnalyticsDimension | null;
    value: string | null;
    sources: SourceRow[];
    models: ModelRow[];
    drilldown: DrilldownRow[];
};

type Props = {
    analytics: Analytics;
};

const percentageFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
});

const periodFormatter = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
});

function formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
}

function formatCategory(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPeriod(value: string): string {
    return periodFormatter.format(new Date(`${value}-01T00:00:00+07:00`));
}

function Metric({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
        </div>
    );
}

export default function AnalyticsIndex({ analytics }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    function visitAnalytics(
        changes: Partial<
            Pick<Analytics, 'period' | 'mode' | 'dimension' | 'value'>
        >,
    ) {
        const next = { ...analytics, ...changes };

        router.get(
            '/analytics',
            {
                period: next.period,
                mode: next.mode,
                dimension: next.dimension ?? undefined,
                value: next.value ?? undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            },
        );
    }

    function openDrilldown(dimension: AnalyticsDimension, value: string) {
        visitAnalytics({ dimension, value });
    }

    const exportQuery = new URLSearchParams({
        period: analytics.period,
        mode: analytics.mode,
    });
    const exportUrl = `/analytics/export.csv?${exportQuery.toString()}`;
    const hasSelection =
        analytics.dimension !== null && analytics.value !== null;

    return (
        <>
            <Head title="Analisis" />
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10 print:max-w-none print:px-0 print:pt-0 print:pb-0">
                <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                            Analisis
                        </h1>
                        <p className="mt-3 text-base leading-7 text-muted-foreground">
                            Bandingkan asal lead dan model kendaraan pada
                            periode yang sama, lalu rekonsiliasi angkanya
                            melalui drilldown.
                        </p>
                        <p className="mt-3 text-sm font-medium">
                            {formatPeriod(analytics.period)} · Mode{' '}
                            {analytics.mode === 'acquisition'
                                ? 'Akuisisi'
                                : 'Pencapaian'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <Button variant="outline" asChild>
                            <a href={exportUrl} download>
                                <Download aria-hidden="true" />
                                Unduh CSV
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.print()}
                            aria-label="Simpan sebagai PDF melalui dialog cetak browser"
                        >
                            <Printer aria-hidden="true" />
                            Save as PDF / browser print
                        </Button>
                    </div>
                </header>

                <section
                    aria-label="Filter analisis"
                    className="mt-8 rounded-xl border bg-card p-5 sm:p-6 print:hidden"
                >
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="analytics-period">Periode</Label>
                            <Input
                                id="analytics-period"
                                type="month"
                                value={analytics.period}
                                disabled={isLoading}
                                onChange={(event) =>
                                    visitAnalytics({
                                        period: event.target.value,
                                    })
                                }
                                className="min-h-11 w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="analytics-mode">Mode tanggal</Label>
                            <Select
                                value={analytics.mode}
                                disabled={isLoading}
                                onValueChange={(mode: AnalyticsMode) =>
                                    visitAnalytics({ mode })
                                }
                            >
                                <SelectTrigger
                                    id="analytics-mode"
                                    className="min-h-11 w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="acquisition">
                                        Akuisisi
                                    </SelectItem>
                                    <SelectItem value="achievement">
                                        Pencapaian
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <p
                        className="mt-4 text-sm text-muted-foreground"
                        role="status"
                        aria-live="polite"
                    >
                        {isLoading
                            ? 'Memuat analisis untuk filter terbaru…'
                            : analytics.mode === 'acquisition'
                              ? 'Akuisisi memakai tanggal lead dibuat.'
                              : 'Pencapaian memakai tanggal kejadian tahap.'}
                    </p>
                </section>

                <aside className="mt-6 rounded-xl border bg-secondary p-5 text-sm leading-6 sm:p-6 print:border print:bg-white">
                    <h2 className="font-semibold">Cara membaca angka</h2>
                    {analytics.mode === 'acquisition' ? (
                        <p className="mt-1 text-muted-foreground print:text-black">
                            Penyebut porsi adalah seluruh lead yang dibuat pada
                            periode dan cakupan akses ini. Conversion dihitung
                            dari jumlah Delivery dibagi jumlah lead pada sumber
                            yang sama.
                        </p>
                    ) : (
                        <p className="mt-1 text-muted-foreground print:text-black">
                            Penyebut porsi adalah seluruh transaksi yang
                            memiliki kejadian tahap pada periode dan cakupan
                            akses ini. Conversion disembunyikan karena event
                            dapat berasal dari kohort akuisisi yang berbeda.
                        </p>
                    )}
                </aside>

                <nav
                    aria-label="Bagian analisis"
                    className="mt-8 flex gap-1 border-b print:hidden"
                >
                    <a
                        href="#analisis-sumber"
                        className="flex min-h-11 items-center border-b-2 border-primary px-4 text-sm font-semibold text-primary"
                    >
                        Analisis Sumber
                    </a>
                    <a
                        href="#analisis-model"
                        className="flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                    >
                        Analisis Model
                    </a>
                </nav>

                <div
                    aria-busy={isLoading}
                    className={isLoading ? 'opacity-60' : ''}
                >
                    <section id="analisis-sumber" className="scroll-mt-24 pt-8">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Analisis Sumber
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Kontribusi sumber lead dan progresnya menuju
                                SPK, DO, serta Delivery.
                            </p>
                        </div>

                        <div className="mt-5 space-y-3 lg:hidden print:hidden">
                            {analytics.sources.length === 0 ? (
                                <EmptyState description="Belum ada transaksi berdasarkan sumber untuk periode dan mode ini." />
                            ) : (
                                analytics.sources.map((row) => (
                                    <article
                                        key={row.source}
                                        className="rounded-xl border bg-card p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold">
                                                {formatCategory(row.source)}
                                            </h3>
                                            <Badge variant="secondary">
                                                {formatPercentage(row.share)}
                                            </Badge>
                                        </div>
                                        <dl className="mt-5 grid grid-cols-2 gap-4">
                                            <Metric
                                                label="Jumlah"
                                                value={row.total}
                                            />
                                            <Metric
                                                label="SPK"
                                                value={row.spk}
                                            />
                                            <Metric label="DO" value={row.do} />
                                            <Metric
                                                label="Delivery"
                                                value={row.delivery}
                                            />
                                            {analytics.mode ===
                                                'acquisition' && (
                                                <Metric
                                                    label="Conversion"
                                                    value={formatPercentage(
                                                        row.conversion ?? 0,
                                                    )}
                                                />
                                            )}
                                        </dl>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-5 w-full"
                                            onClick={() =>
                                                openDrilldown(
                                                    'source',
                                                    row.source,
                                                )
                                            }
                                        >
                                            Drilldown
                                        </Button>
                                    </article>
                                ))
                            )}
                        </div>

                        <SourceTable
                            rows={analytics.sources}
                            mode={analytics.mode}
                            onDrilldown={(value) =>
                                openDrilldown('source', value)
                            }
                        />
                    </section>

                    <section id="analisis-model" className="scroll-mt-24 pt-12">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Analisis Model
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Sebaran model kendaraan dan pencapaian tahap
                                untuk filter yang sama.
                            </p>
                        </div>

                        <div className="mt-5 space-y-3 lg:hidden print:hidden">
                            {analytics.models.length === 0 ? (
                                <EmptyState description="Belum ada transaksi berdasarkan model untuk periode dan mode ini." />
                            ) : (
                                analytics.models.map((row) => (
                                    <article
                                        key={row.model}
                                        className="rounded-xl border bg-card p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold">
                                                {row.model}
                                            </h3>
                                            <Badge variant="secondary">
                                                {formatPercentage(row.share)}
                                            </Badge>
                                        </div>
                                        <dl className="mt-5 grid grid-cols-2 gap-4">
                                            <Metric
                                                label="Jumlah"
                                                value={row.total}
                                            />
                                            <Metric
                                                label="SPK"
                                                value={row.spk}
                                            />
                                            <Metric label="DO" value={row.do} />
                                            <Metric
                                                label="Delivery"
                                                value={row.delivery}
                                            />
                                        </dl>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-5 w-full"
                                            onClick={() =>
                                                openDrilldown(
                                                    'model',
                                                    row.model,
                                                )
                                            }
                                        >
                                            Drilldown
                                        </Button>
                                    </article>
                                ))
                            )}
                        </div>

                        <ModelTable
                            rows={analytics.models}
                            onDrilldown={(value) =>
                                openDrilldown('model', value)
                            }
                        />
                    </section>

                    <section className="pt-12 print:hidden">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold">Drilldown</h2>
                            {hasSelection && (
                                <Badge variant="secondary">
                                    {analytics.dimension === 'source'
                                        ? 'Sumber'
                                        : 'Model'}
                                    : {formatCategory(analytics.value ?? '')}
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Hanya field transaksi tersanitasi yang ditampilkan;
                            tanpa kontak pelanggan, catatan, atau coaching.
                        </p>

                        {!hasSelection ? (
                            <div className="mt-5">
                                <EmptyState description="Pilih Drilldown pada salah satu sumber atau model untuk melihat transaksi pembentuk angka." />
                            </div>
                        ) : analytics.drilldown.length === 0 ? (
                            <div className="mt-5">
                                <EmptyState description="Tidak ada transaksi yang cocok dengan drilldown dan filter saat ini." />
                            </div>
                        ) : (
                            <DrilldownList rows={analytics.drilldown} />
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

function EmptyState({ description }: { description: string }) {
    return (
        <div className="rounded-xl border border-dashed bg-card px-5 py-10 text-center text-sm text-muted-foreground">
            {description}
        </div>
    );
}

function SourceTable({
    rows,
    mode,
    onDrilldown,
}: {
    rows: SourceRow[];
    mode: AnalyticsMode;
    onDrilldown: (value: string) => void;
}) {
    const columnCount = mode === 'acquisition' ? 8 : 7;

    return (
        <div className="mt-5 hidden overflow-hidden rounded-xl border lg:block print:block">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase print:bg-white print:text-black">
                    <tr>
                        <th className="px-4 py-3">Sumber</th>
                        <th className="px-4 py-3 text-right">Jumlah</th>
                        <th className="px-4 py-3 text-right">Porsi</th>
                        <th className="px-4 py-3 text-right">SPK</th>
                        <th className="px-4 py-3 text-right">DO</th>
                        <th className="px-4 py-3 text-right">Delivery</th>
                        {mode === 'acquisition' && (
                            <th className="px-4 py-3 text-right">Conversion</th>
                        )}
                        <th className="px-4 py-3 text-right print:hidden">
                            Aksi
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columnCount}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                Belum ada transaksi berdasarkan sumber untuk
                                periode dan mode ini.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.source}>
                                <th className="px-4 py-3 text-left font-semibold">
                                    {formatCategory(row.source)}
                                </th>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.total}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {formatPercentage(row.share)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.spk}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.do}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.delivery}
                                </td>
                                {mode === 'acquisition' && (
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {formatPercentage(row.conversion ?? 0)}
                                    </td>
                                )}
                                <td className="px-4 py-3 text-right print:hidden">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onDrilldown(row.source)}
                                    >
                                        Drilldown
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ModelTable({
    rows,
    onDrilldown,
}: {
    rows: ModelRow[];
    onDrilldown: (value: string) => void;
}) {
    return (
        <div className="mt-5 hidden overflow-hidden rounded-xl border lg:block print:block">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase print:bg-white print:text-black">
                    <tr>
                        <th className="px-4 py-3">Model</th>
                        <th className="px-4 py-3 text-right">Jumlah</th>
                        <th className="px-4 py-3 text-right">Porsi</th>
                        <th className="px-4 py-3 text-right">SPK</th>
                        <th className="px-4 py-3 text-right">DO</th>
                        <th className="px-4 py-3 text-right">Delivery</th>
                        <th className="px-4 py-3 text-right print:hidden">
                            Aksi
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                Belum ada transaksi berdasarkan model untuk
                                periode dan mode ini.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.model}>
                                <th className="px-4 py-3 text-left font-semibold">
                                    {row.model}
                                </th>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.total}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {formatPercentage(row.share)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.spk}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.do}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.delivery}
                                </td>
                                <td className="px-4 py-3 text-right print:hidden">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onDrilldown(row.model)}
                                    >
                                        Drilldown
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function DrilldownList({ rows }: { rows: DrilldownRow[] }) {
    return (
        <>
            <div className="mt-5 space-y-3 lg:hidden print:hidden">
                {rows.map((row) => (
                    <article
                        key={row.public_id}
                        className="rounded-xl border bg-card p-5"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold">
                                    {row.vehicle_model}
                                </h3>
                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                    {row.public_id}
                                </p>
                            </div>
                            <Badge variant="outline">{row.stage_label}</Badge>
                        </div>
                        <dl className="mt-5 grid grid-cols-2 gap-4">
                            <Metric
                                label="Sumber"
                                value={formatCategory(row.source)}
                            />
                            <Metric
                                label="Sales"
                                value={row.sales_name ?? 'Belum ditugaskan'}
                            />
                            <Metric
                                label="Dibuat"
                                value={dateFormatter.format(
                                    new Date(row.created_at),
                                )}
                            />
                        </dl>
                    </article>
                ))}
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-xl border lg:block print:block">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase print:bg-white print:text-black">
                        <tr>
                            <th className="px-4 py-3">ID publik</th>
                            <th className="px-4 py-3">Model</th>
                            <th className="px-4 py-3">Sumber</th>
                            <th className="px-4 py-3">Tahap</th>
                            <th className="px-4 py-3">Sales</th>
                            <th className="px-4 py-3">Dibuat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.map((row) => (
                            <tr key={row.public_id}>
                                <td className="px-4 py-3 font-mono text-xs">
                                    {row.public_id}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                    {row.vehicle_model}
                                </td>
                                <td className="px-4 py-3">
                                    {formatCategory(row.source)}
                                </td>
                                <td className="px-4 py-3">{row.stage_label}</td>
                                <td className="px-4 py-3">
                                    {row.sales_name ?? 'Belum ditugaskan'}
                                </td>
                                <td className="px-4 py-3">
                                    {dateFormatter.format(
                                        new Date(row.created_at),
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

AnalyticsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Analisis',
            href: '/analytics',
        },
    ],
};
