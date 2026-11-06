import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import {
    amount,
    PerformanceTable,
    stageLabel,
    type PerformanceRow,
    type ReportingProps,
} from '@/components/team-performance';
import { Button } from '@/components/ui/button';
import {
    chartMaximum,
    chartWidth,
    rankPerformance,
} from '@/lib/dashboard-charts';

type DashboardData = ReportingProps['dashboard'];

function ComparisonBars({
    row,
    maximum,
    showTarget,
}: {
    row: PerformanceRow;
    maximum: number;
    showTarget: boolean;
}) {
    return (
        <div className="mt-3">
            <dl className="grid gap-2">
                {[
                    {
                        label: 'Realisasi',
                        value: row.realization_units,
                        color: 'bg-primary',
                    },
                    {
                        label: 'Forecast',
                        value: row.forecast_units,
                        color: 'bg-blue-300',
                    },
                ].map(({ label, value, color }) => (
                    <div
                        key={label}
                        className="grid grid-cols-[4rem_minmax(0,1fr)_4.5rem] items-center gap-3"
                    >
                        <dt className="text-xs text-muted-foreground">
                            {label}
                        </dt>
                        <div
                            aria-hidden="true"
                            className="relative h-2 rounded-sm bg-muted"
                        >
                            <span
                                className={`block h-full rounded-sm ${color}`}
                                style={{
                                    width: `${chartWidth(value, maximum)}%`,
                                }}
                            />
                            {showTarget && row.target_units !== null && (
                                <span
                                    className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-foreground"
                                    style={{
                                        left: `${chartWidth(row.target_units, maximum)}%`,
                                    }}
                                />
                            )}
                        </div>
                        <dd className="min-w-0 text-right text-xs leading-4 font-medium break-words tabular-nums">
                            {amount(value, 'Tidak tersedia')}
                        </dd>
                    </div>
                ))}
            </dl>
            {showTarget && (
                <p className="mt-2 text-right text-xs text-muted-foreground">
                    Target:{' '}
                    <span className="font-medium text-foreground tabular-nums">
                        {amount(row.target_units)}
                    </span>
                    {row.target_units !== null && ' unit'}
                </p>
            )}
        </div>
    );
}

export function PerformanceChart({
    rows,
    team = false,
    showTarget,
}: {
    rows: PerformanceRow[];
    team?: boolean;
    showTarget: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const sorted = team ? rows : rankPerformance(rows);
    const visible = team || expanded ? sorted : sorted.slice(0, 5);
    const maximum = chartMaximum(
        rows.flatMap((row) => [
            row.realization_units,
            row.forecast_units,
            showTarget ? row.target_units : null,
        ]),
    );
    const title = team ? 'Kinerja per tim' : 'Kinerja per Sales';
    return (
        <section
            aria-label={title}
            data-comfortable-controls
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
        >
            <header className="p-5 pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <span className="text-xs text-muted-foreground">
                        {rows.length} {team ? 'tim' : 'Sales'} · unit
                    </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {team
                        ? 'Bandingkan hasil dan estimasi setiap tim.'
                        : 'Diurutkan dari realisasi, lalu forecast tertinggi.'}{' '}
                    Forecast sudah mencakup realisasi.
                </p>
                <div
                    className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
                    aria-hidden="true"
                >
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-4 rounded-sm bg-primary" />
                        Realisasi
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-4 rounded-sm bg-blue-300" />
                        Forecast
                    </span>
                    {showTarget && (
                        <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-0.5 bg-foreground" />
                            {team ? 'Target management' : 'Target personal'}
                        </span>
                    )}
                </div>
            </header>
            {rows.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                    Belum ada data kinerja pada periode ini.
                </p>
            ) : (
                <>
                    <ol
                        className="mt-3 divide-y"
                        id={
                            team
                                ? 'dashboard-team-rows'
                                : 'dashboard-sales-rows'
                        }
                    >
                        {visible.map((row, index) => (
                            <li key={row.id} className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                    {!team && (
                                        <span className="w-4 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                                            {index + 1}.
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-medium break-words">
                                            {row.name}
                                        </h3>
                                        {row.is_active === false && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Tim nonaktif
                                            </p>
                                        )}
                                        {row.is_current_member === false && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Transaksi tercatat; bukan
                                                anggota aktif tim ini
                                            </p>
                                        )}
                                        <ComparisonBars
                                            row={row}
                                            maximum={maximum}
                                            showTarget={showTarget}
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                    {!team && rows.length > 5 && (
                        <div className="px-5 pb-4">
                            <Button
                                variant="secondary"
                                className="min-h-11"
                                aria-expanded={expanded}
                                aria-controls="dashboard-sales-rows"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded
                                    ? 'Tampilkan lima teratas'
                                    : `Tampilkan semua ${rows.length} Sales`}
                            </Button>
                        </div>
                    )}
                    <details className="group/details border-t">
                        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4 shrink-0 transition-transform group-open/details:rotate-90 motion-reduce:transition-none"
                            />{' '}
                            Lihat rincian angka {team ? 'tim' : 'Sales'}
                        </summary>
                        <div className="p-3 pt-0">
                            <PerformanceTable
                                title={
                                    team
                                        ? 'Rincian kinerja tim'
                                        : 'Rincian kinerja Sales'
                                }
                                rows={sorted}
                                team={team}
                            />
                        </div>
                    </details>
                </>
            )}
        </section>
    );
}

export function PipelineChart({
    counts,
}: {
    counts: DashboardData['stageCounts'];
}) {
    const stages = [
        'lead',
        'prospect',
        'hot_prospect',
        'spk',
        'do',
        'delivery',
        'lost',
    ];
    const maximum = chartMaximum(stages.map((stage) => counts[stage] ?? 0));
    const empty = stages.every((stage) => !counts[stage]);
    return (
        <section
            aria-label="Pipeline per tahap"
            className="min-w-0 rounded-xl border bg-card p-5"
        >
            <h2 className="text-base font-semibold">Pipeline per tahap</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Distribusi transaksi pada periode terpilih, bukan rasio konversi
                antar tahap.
            </p>
            <dl className="mt-5 grid gap-4">
                {stages.map((stage) => (
                    <div key={stage}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <dt>
                                <StageBadge stage={stage}>
                                    {stageLabel(stage)}
                                </StageBadge>
                            </dt>
                            <dd className="text-sm font-medium tabular-nums">
                                {amount(counts[stage] ?? 0)}
                            </dd>
                        </div>
                        <div
                            aria-hidden="true"
                            className="h-2 rounded-sm bg-muted"
                        >
                            <span
                                className={`block h-full rounded-sm ${stage === 'lost' ? 'bg-muted-foreground' : 'bg-primary'}`}
                                style={{
                                    width: `${chartWidth(counts[stage] ?? 0, maximum)}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </dl>
            {empty && (
                <p className="mt-4 text-sm text-muted-foreground">
                    Belum ada transaksi pada periode ini.
                </p>
            )}
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Tahap aktif mengikuti estimasi closing atau kejadian pada
                periode ini. DO mencatat realisasi, sedangkan Delivery mencatat
                konfirmasi pengiriman.
            </p>
        </section>
    );
}

export function ForecastContributors({
    contributors,
}: {
    contributors: DashboardData['contributors'];
}) {
    const maximum = chartMaximum(contributors.map((row) => row.weighted_value));
    return (
        <section
            aria-label="Kontributor forecast teratas"
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
        >
            <header className="p-5 pb-0">
                <h2 className="text-base font-semibold">
                    Kontributor forecast teratas
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Nilai rupiah berbobot pada estimasi bulan closing terpilih,
                    bukan kepastian penjualan.
                </p>
            </header>
            {!contributors.length ? (
                <p className="p-5 text-sm text-muted-foreground">
                    Tidak ada kontributor forecast pada periode ini.
                </p>
            ) : (
                <ol className="mt-3 divide-y">
                    {contributors.map((row) => (
                        <li key={row.public_id} className="p-5 pt-4">
                            <p className="text-sm font-medium break-words">
                                {row.vehicle_model}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StageBadge stage={row.stage_label}>
                                    {row.stage_label}
                                </StageBadge>
                                {row.sales_name && (
                                    <span className="text-xs break-words text-muted-foreground">
                                        {row.sales_name}
                                    </span>
                                )}
                            </div>
                            <p className="mt-3 text-sm font-medium break-words tabular-nums">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    maximumFractionDigits: 0,
                                }).format(row.weighted_value)}
                            </p>
                            <div
                                aria-hidden="true"
                                className="mt-2 h-1.5 rounded-sm bg-muted"
                            >
                                <span
                                    className="block h-full rounded-sm bg-primary"
                                    style={{
                                        width: `${chartWidth(row.weighted_value, maximum)}%`,
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
