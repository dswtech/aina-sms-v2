import { Head, router, usePage } from '@inertiajs/react';
import { FilterPanel } from '@/components/filter-panel';
import { Download, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/stage-badge';
import {
    ChartPanel,
    ConversionBars,
    eventSegments,
    furthestSegments,
    OTHER_ROW_KEY,
    ShareDonut,
    SourceFlow,
    sourcePalette,
    stageColors,
    StageBars,
    StageSummary,
} from '@/components/analytics-charts';
import type { ChartRow, StageBuckets } from '@/components/analytics-charts';
import { Button } from '@/components/ui/button';
import { MonthRangeFields } from '@/components/month-range-fields';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';
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
    conversion: number | null;
    furthest: StageBuckets | null;
};

type ModelRow = {
    model: string;
    total: number;
    share: number;
    spk: number;
    do: number;
    furthest: StageBuckets | null;
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
    to: string;
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

function formatPercentage(value: number): string {
    return `${percentageFormatter.format(value)}%`;
}

function formatCategory(value: string): string {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const TOP_MODELS = 9;

// Same formula as the server's source conversion (DO ÷ lead), so both tabs read alike.
function conversionOf(row: { do: number; total: number }): number {
    return row.total ? Math.round((row.do / row.total) * 1000) / 10 : 0;
}

function sourceChartRows(rows: SourceRow[]): ChartRow[] {
    return rows.map((row, index) => ({
        ...row,
        key: row.source,
        label: formatCategory(row.source),
        color: sourcePalette[index] ?? 'var(--muted-foreground)',
    }));
}

// Top models plus one "Lainnya" row keep the chart readable; the table still lists every model.
function modelChartRows(rows: ModelRow[]): ChartRow[] {
    const chartRows = rows.map((row) => ({
        ...row,
        key: row.model,
        label: row.model,
        color: stageColors.do,
    }));
    const rest = chartRows.slice(TOP_MODELS);
    if (rest.length < 2) return chartRows;
    const add = (key: keyof StageBuckets) =>
        rest.reduce((sum, row) => sum + (row.furthest?.[key] ?? 0), 0);
    return [
        ...chartRows.slice(0, TOP_MODELS),
        {
            key: OTHER_ROW_KEY,
            label: `Lainnya (${rest.length} model)`,
            color: stageColors.do,
            total: rest.reduce((sum, row) => sum + row.total, 0),
            spk: rest.reduce((sum, row) => sum + row.spk, 0),
            do: rest.reduce((sum, row) => sum + row.do, 0),
            furthest: rest[0].furthest
                ? {
                      lead: add('lead'),
                      spk: add('spk'),
                      do: add('do'),
                  }
                : null,
        },
    ];
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

type AnalyticsQuery = Pick<
    Analytics,
    'period' | 'to' | 'mode' | 'dimension' | 'value'
>;

export default function AnalyticsIndex({ analytics }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [monthFrom, setMonthFrom] = useState(analytics.period);
    const [monthTo, setMonthTo] = useState(analytics.to);
    const rangeError = monthRangeError(monthFrom, monthTo);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const [failure, setFailure] = useState<{
        query: AnalyticsQuery | null;
        message: string;
    } | null>(null);
    const retryQuery = failure?.query;
    const { url } = usePage();
    const [view, setView] = useState<AnalyticsDimension>(() =>
        new URLSearchParams(url.split('?')[1] ?? '').get('view') === 'model'
            ? 'model'
            : 'source',
    );
    const [sheetOpen, setSheetOpen] = useState(
        analytics.dimension !== null && analytics.value !== null,
    );
    const isMobile = useIsMobile();
    // Separate hooks: the React Compiler caches object literals, which would skip a hook inside one.
    const sourceTabRef = useRef<HTMLButtonElement>(null);
    const modelTabRef = useRef<HTMLButtonElement>(null);
    const tabRefs = { source: sourceTabRef, model: modelTabRef };

    // Tabs only change what is shown, so update the URL client-side without a server round trip.
    function selectView(next: AnalyticsDimension) {
        setView(next);
        const params = new URLSearchParams(
            window.location.search.replace(/^\?/, ''),
        );
        if (next === 'source') params.delete('view');
        else params.set('view', next);
        const query = params.toString();
        router.replace({
            url: `${window.location.pathname}${query ? `?${query}` : ''}`,
            preserveState: true,
            preserveScroll: true,
        });
    }

    function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
            return;
        event.preventDefault();
        const next =
            event.key === 'Home'
                ? 'source'
                : event.key === 'End'
                  ? 'model'
                  : view === 'source'
                    ? 'model'
                    : 'source';
        selectView(next);
        tabRefs[next].current?.focus();
    }

    function visitAnalytics(
        changes: Partial<AnalyticsQuery>,
        focusAfter?: RefObject<HTMLElement | null>,
    ) {
        const next = {
            period: analytics.period,
            to: analytics.to,
            mode: analytics.mode,
            dimension: analytics.dimension,
            value: analytics.value,
            ...changes,
        };
        const showFailure = (message: string) =>
            setFailure({ query: next, message });

        router.get(
            '/analytics',
            {
                period: next.period,
                to: next.to,
                mode: next.mode,
                dimension: next.dimension ?? undefined,
                value: next.value ?? undefined,
                view: view === 'model' ? 'model' : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
                onSuccess: () => {
                    setFailure(null);
                    focusAfter?.current?.focus();
                },
                onError: () =>
                    setFailure({
                        query: null,
                        message: 'Periksa kembali filter Analisis.',
                    }),
                onNetworkError: () => {
                    showFailure('Koneksi terputus saat memuat Analisis.');
                    return false;
                },
                onHttpException: (response) => {
                    if (response.status === 401 || response.status === 403)
                        return;
                    showFailure('Analisis belum dapat dimuat.');
                    return false;
                },
            },
        );
    }

    // The sheet opens at once and fills when the server answers, so every trigger behaves the same.
    // The server reload re-renders the page, so Radix loses the opener; remember it ourselves.
    const returnFocus = useRef<HTMLElement | null>(null);
    function openDrilldown(dimension: AnalyticsDimension, value: string) {
        if (!sheetOpen && document.activeElement instanceof HTMLElement)
            returnFocus.current = document.activeElement;
        setSheetOpen(true);
        visitAnalytics({ dimension, value });
    }

    function closeDrilldown() {
        setSheetOpen(false);
        visitAnalytics({ dimension: null, value: null });
    }

    const drilldownFrom = (dimension: AnalyticsDimension) => (row: ChartRow) =>
        openDrilldown(dimension, row.key);

    const exportQuery = new URLSearchParams({
        period: analytics.period,
        to: analytics.to,
        mode: analytics.mode,
    });
    const exportUrl = `/analytics/export.csv?${exportQuery.toString()}`;
    const hasSelection =
        analytics.dimension !== null && analytics.value !== null;
    const acquisition = analytics.mode === 'acquisition';
    const sourceRows = sourceChartRows(analytics.sources);
    const modelRows = modelChartRows(analytics.models);

    return (
        <>
            <Head title="Analisis" />
            <div className="analytics-print mx-auto w-full max-w-screen-2xl flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10 print:max-w-none print:px-0 print:pt-0 print:pb-0">
                <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <h1
                            ref={headingRef}
                            tabIndex={-1}
                            className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl"
                        >
                            Analisis
                        </h1>
                        <p className="mt-3 text-base leading-7 text-muted-foreground">
                            Bandingkan asal lead dan model kendaraan pada
                            periode yang sama, lalu rekonsiliasi angkanya
                            melalui drilldown.
                        </p>
                        <p className="mt-3 text-sm font-medium">
                            {formatMonthRange(analytics.period, analytics.to)} ·
                            Mode{' '}
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

                <FilterPanel
                    title="Filter analisis"
                    iconOnly
                    className="mt-8 print:hidden"
                    summary={`${formatMonthRange(analytics.period, analytics.to)} · ${analytics.mode === 'acquisition' ? 'Akuisisi' : 'Pencapaian'}`}
                >
                    <div className="grid items-end gap-4 xl:grid-cols-[2fr_1fr_auto]">
                        <MonthRangeFields
                            id="analytics-period"
                            from={monthFrom}
                            to={monthTo}
                            disabled={isLoading}
                            onChange={(from, to) => {
                                setMonthFrom(from);
                                setMonthTo(to);
                            }}
                        />
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
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading || !!rangeError}
                            onClick={() =>
                                visitAnalytics({
                                    period: monthFrom,
                                    to: monthTo,
                                })
                            }
                        >
                            Tampilkan
                        </Button>
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
                </FilterPanel>

                {failure && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 print:hidden">
                        <p role="alert" className="text-sm text-foreground">
                            {failure.message} Laporan masih menampilkan data
                            terakhir yang berhasil dimuat.
                        </p>
                        {retryQuery && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() =>
                                    visitAnalytics(retryQuery, headingRef)
                                }
                            >
                                Coba lagi
                            </Button>
                        )}
                    </div>
                )}

                {sourceRows.length > 0 && (
                    <StageSummary rows={sourceRows} acquisition={acquisition} />
                )}

                <aside className="mt-6 rounded-xl border bg-secondary p-5 text-sm leading-6 sm:p-6 print:border print:bg-white">
                    <h2 className="font-semibold">Cara membaca angka</h2>
                    {analytics.mode === 'acquisition' ? (
                        <p className="mt-1 text-muted-foreground print:text-black">
                            Penyebut porsi adalah seluruh lead yang dibuat pada
                            periode dan cakupan akses ini. Conversion dihitung
                            dari jumlah DO dibagi jumlah lead pada sumber yang
                            sama.
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

                <div
                    role="tablist"
                    aria-label="Bagian analisis"
                    className="mt-8 flex gap-1 border-b print:hidden"
                >
                    {(['source', 'model'] as const).map((tab) => (
                        <button
                            key={tab}
                            ref={tabRefs[tab]}
                            type="button"
                            role="tab"
                            id={`tab-${tab}`}
                            aria-selected={view === tab}
                            aria-controls={
                                tab === 'source'
                                    ? 'analisis-sumber'
                                    : 'analisis-model'
                            }
                            tabIndex={view === tab ? 0 : -1}
                            onClick={() => selectView(tab)}
                            onKeyDown={onTabKeyDown}
                            className={cn(
                                '-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                view === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab === 'source'
                                ? 'Analisis Sumber'
                                : 'Analisis Model'}
                        </button>
                    ))}
                </div>

                <div
                    aria-busy={isLoading}
                    className={isLoading ? 'opacity-60' : ''}
                >
                    {/* The inactive panel stays in print so the PDF keeps both tables. */}
                    <section
                        id="analisis-sumber"
                        role="tabpanel"
                        aria-labelledby="tab-source"
                        className={cn(
                            'pt-6 print:block print:pt-8',
                            view !== 'source' && 'hidden',
                        )}
                    >
                        <div>
                            <h2 className="sr-only text-xl font-semibold print:not-sr-only">
                                Analisis Sumber
                            </h2>
                            <p className="text-sm text-muted-foreground print:mt-1">
                                {acquisition
                                    ? 'Kontribusi sumber lead dan progresnya menuju SPK serta DO.'
                                    : 'Kejadian SPK dan DO pada periode ini, dikelompokkan per sumber.'}
                            </p>
                        </div>

                        {sourceRows.length > 0 && (
                            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                                {acquisition ? (
                                    <ChartPanel
                                        id="source-flow-title"
                                        title="Alur lead: sumber → tahap terjauh"
                                        description="Lebar pita = jumlah lead. Arahkan kursor ke pita untuk melihat angkanya."
                                    >
                                        <SourceFlow
                                            rows={sourceRows}
                                            onSelect={drilldownFrom('source')}
                                        />
                                    </ChartPanel>
                                ) : (
                                    <ChartPanel
                                        id="source-events-title"
                                        title="Kejadian tahap per sumber"
                                        description="SPK dan DO yang terjadi pada periode ini, dari kohort mana pun."
                                    >
                                        <StageBars
                                            rows={sourceRows}
                                            segments={eventSegments}
                                            unit="kejadian"
                                            width={600}
                                            onSelect={drilldownFrom('source')}
                                        />
                                    </ChartPanel>
                                )}
                                <ChartPanel
                                    id="source-share-title"
                                    title="Porsi sumber"
                                    description={
                                        acquisition
                                            ? 'Dari total lead periode ini.'
                                            : 'Dari transaksi yang punya kejadian tahap.'
                                    }
                                >
                                    <ShareDonut
                                        rows={sourceRows}
                                        unit={
                                            acquisition ? 'lead' : 'transaksi'
                                        }
                                        onSelect={drilldownFrom('source')}
                                    />
                                </ChartPanel>
                                {acquisition && (
                                    <ChartPanel
                                        id="source-conversion-title"
                                        title="Conversion per sumber (DO ÷ lead)"
                                        description="Garis putus-putus = rata-rata semua sumber."
                                        className="lg:col-span-2"
                                    >
                                        <ConversionBars
                                            rows={sourceRows}
                                            onSelect={drilldownFrom('source')}
                                        />
                                    </ChartPanel>
                                )}
                            </div>
                        )}

                        <div className="mt-5 space-y-3 lg:hidden print:hidden">
                            {analytics.sources.length === 0 ? (
                                <EmptyState description="Belum ada transaksi berdasarkan sumber untuk periode dan mode ini." />
                            ) : (
                                analytics.sources.map((row) => (
                                    <article
                                        key={row.source}
                                        className="striped-row rounded-xl border p-5"
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

                    <section
                        id="analisis-model"
                        role="tabpanel"
                        aria-labelledby="tab-model"
                        className={cn(
                            'pt-6 print:block print:pt-12',
                            view !== 'model' && 'hidden',
                        )}
                    >
                        <div>
                            <h2 className="sr-only text-xl font-semibold print:not-sr-only">
                                Analisis Model
                            </h2>
                            <p className="text-sm text-muted-foreground print:mt-1">
                                Sebaran model kendaraan dan pencapaian tahap
                                untuk filter yang sama.
                            </p>
                        </div>

                        {modelRows.length > 0 && (
                            <ChartPanel
                                id="model-stage-title"
                                title={
                                    acquisition
                                        ? 'Lead per model, menurut tahap terjauh'
                                        : 'Kejadian tahap per model'
                                }
                                description={`${analytics.models.length > TOP_MODELS + 1 ? `${TOP_MODELS} model teratas, sisanya digabung. ` : ''}Tabel di bawah memuat semua model.`}
                                className="mt-5"
                            >
                                <StageBars
                                    rows={modelRows}
                                    segments={
                                        acquisition
                                            ? furthestSegments
                                            : eventSegments
                                    }
                                    unit={acquisition ? 'lead' : 'kejadian'}
                                    onSelect={drilldownFrom('model')}
                                />
                            </ChartPanel>
                        )}

                        {modelRows.length > 0 && acquisition && (
                            <ChartPanel
                                id="model-conversion-title"
                                title="Conversion per model (DO ÷ lead)"
                                description="Garis putus-putus = rata-rata semua model. Perhatikan angka DO/lead: model dengan sedikit lead mudah tampak tinggi."
                                className="mt-4"
                            >
                                <ConversionBars
                                    rows={modelRows}
                                    onSelect={drilldownFrom('model')}
                                />
                            </ChartPanel>
                        )}

                        <div className="mt-5 space-y-3 lg:hidden print:hidden">
                            {analytics.models.length === 0 ? (
                                <EmptyState description="Belum ada transaksi berdasarkan model untuk periode dan mode ini." />
                            ) : (
                                analytics.models.map((row) => (
                                    <article
                                        key={row.model}
                                        className="striped-row rounded-xl border p-5"
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
                                            {acquisition && (
                                                <Metric
                                                    label="Conversion"
                                                    value={formatPercentage(
                                                        conversionOf(row),
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
                            mode={analytics.mode}
                            onDrilldown={(value) =>
                                openDrilldown('model', value)
                            }
                        />
                    </section>
                </div>

                <Sheet
                    open={sheetOpen}
                    onOpenChange={(open) => !open && closeDrilldown()}
                >
                    <SheetContent
                        side={isMobile ? 'bottom' : 'right'}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            const opener = returnFocus.current;
                            // Chart marks are not focusable; fall back to the active tab.
                            (opener?.isConnected && opener !== document.body
                                ? opener
                                : tabRefs[view].current
                            )?.focus();
                        }}
                        className={cn(
                            'gap-0 overflow-y-auto print:hidden',
                            isMobile
                                ? 'max-h-[85vh] rounded-t-2xl'
                                : 'w-full sm:max-w-xl',
                        )}
                    >
                        <SheetHeader className="border-b pr-14">
                            <SheetTitle>
                                Drilldown
                                {hasSelection &&
                                    ` · ${analytics.dimension === 'source' ? formatCategory(analytics.value ?? '') : analytics.value}`}
                            </SheetTitle>
                            <SheetDescription>
                                {hasSelection && !isLoading
                                    ? `${analytics.drilldown.length} transaksi · ${formatMonthRange(analytics.period, analytics.to)}. `
                                    : ''}
                                Hanya field transaksi tersanitasi; tanpa kontak
                                pelanggan, catatan, atau coaching.
                            </SheetDescription>
                            {hasSelection && (
                                <DrilldownSwitcher
                                    dimension={analytics.dimension!}
                                    value={analytics.value!}
                                    options={
                                        analytics.dimension === 'source'
                                            ? analytics.sources.map((row) => ({
                                                  value: row.source,
                                                  label: formatCategory(
                                                      row.source,
                                                  ),
                                              }))
                                            : analytics.models.map((row) => ({
                                                  value: row.model,
                                                  label: row.model,
                                              }))
                                    }
                                    disabled={isLoading}
                                    onChange={(value) =>
                                        openDrilldown(
                                            analytics.dimension!,
                                            value,
                                        )
                                    }
                                />
                            )}
                        </SheetHeader>
                        <div
                            className={cn('p-4', isLoading && 'opacity-60')}
                            aria-busy={isLoading}
                        >
                            {!hasSelection ||
                            (isLoading && analytics.drilldown.length === 0) ? (
                                <p
                                    role="status"
                                    className="py-10 text-center text-sm text-muted-foreground"
                                >
                                    Memuat transaksi…
                                </p>
                            ) : analytics.drilldown.length === 0 ? (
                                <EmptyState description="Tidak ada transaksi yang cocok dengan drilldown dan filter saat ini." />
                            ) : (
                                <DrilldownList
                                    rows={analytics.drilldown}
                                    dimension={analytics.dimension!}
                                />
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
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
    const columnCount = mode === 'acquisition' ? 7 : 6;

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
                            <tr key={row.source} className="striped-row">
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
                                {mode === 'acquisition' && (
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {formatPercentage(row.conversion ?? 0)}
                                    </td>
                                )}
                                <td className="table-actions px-4 py-3 text-right print:hidden">
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
    mode,
    onDrilldown,
}: {
    rows: ModelRow[];
    mode: AnalyticsMode;
    onDrilldown: (value: string) => void;
}) {
    const acquisition = mode === 'acquisition';

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
                        {acquisition && (
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
                                colSpan={acquisition ? 7 : 6}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                Belum ada transaksi berdasarkan model untuk
                                periode dan mode ini.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.model} className="striped-row">
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
                                {acquisition && (
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {formatPercentage(conversionOf(row))}
                                    </td>
                                )}
                                <td className="table-actions px-4 py-3 text-right print:hidden">
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

function DrilldownSwitcher({
    dimension,
    value,
    options,
    disabled,
    onChange,
}: {
    dimension: AnalyticsDimension;
    value: string;
    options: { value: string; label: string }[];
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="mt-3 space-y-2">
            <Label htmlFor="drilldown-switch">
                {dimension === 'source' ? 'Ganti sumber' : 'Ganti model'}
            </Label>
            <Select value={value} disabled={disabled} onValueChange={onChange}>
                <SelectTrigger
                    id="drilldown-switch"
                    className="min-h-11 w-full"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// The selected dimension is already in the sheet title, so each row shows the other one.
function DrilldownList({
    rows,
    dimension,
}: {
    rows: DrilldownRow[];
    dimension: AnalyticsDimension;
}) {
    return (
        <ul className="divide-y overflow-hidden rounded-xl border">
            {rows.map((row) => (
                <li
                    key={row.public_id}
                    className="striped-row grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                    <p className="truncate font-semibold">
                        {dimension === 'source'
                            ? row.vehicle_model
                            : formatCategory(row.source)}
                    </p>
                    <StageBadge stage={row.stage}>{row.stage_label}</StageBadge>
                    <p className="col-span-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span className="font-mono">{row.public_id}</span>
                        <span>{row.sales_name ?? 'Belum ditugaskan'}</span>
                        <span>
                            {dateFormatter.format(new Date(row.created_at))}
                        </span>
                    </p>
                </li>
            ))}
        </ul>
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
