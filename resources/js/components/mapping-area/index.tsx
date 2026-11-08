import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { FlaskConical, RotateCcw, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartExportMenu } from '@/components/chart-export-menu';
import { FilterPanel } from '@/components/filter-panel';
import { MonthRangeFields } from '@/components/month-range-fields';
import { areaDistricts, areaRegions } from '@/lib/bandung-raya-districts';
import {
    buildAreaDeals,
    initialFoaCodes,
    summarizeArea,
} from '@/lib/area-preview';
import { syntheticDeals } from '@/lib/financing-preview';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';
import { chartRowColor, makeAreaChartExport } from '@/lib/chart-export';
import type { AreaDeal } from '@/lib/area-preview';
import { AreaMaster, AreaTransactionPreview } from './editors';

const initialDeals = buildAreaDeals(syntheticDeals, areaDistricts, areaRegions);
const sampleIds = [
    initialDeals.find((row) => !row.doMonth)!.id,
    initialDeals.find((row) => !row.doMonth && row.area.regionCode === 'other')!
        .id,
    initialDeals.find((row) => row.doMonth)!.id,
];
const percentage = (count: number, total: number) =>
    `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(total ? (count / total) * 100 : 0)}%`;

function AreaReport({
    deals,
    foaCodes,
    onUpdate,
    canTryForm,
}: {
    deals: AreaDeal[];
    foaCodes: ReadonlySet<string>;
    onUpdate: (deal: AreaDeal) => void;
    canTryForm: boolean;
}) {
    const [from, setFrom] = useState('2026-11');
    const [to, setTo] = useState('2026-11');
    const [applied, setApplied] = useState({ from: '2026-11', to: '2026-11' });
    const result = summarizeArea(deals, applied.from, applied.to);
    const periodLabel = formatMonthRange(applied.from, applied.to);
    const chart = makeAreaChartExport(
        { ...applied, periodLabel, mode: 'do', synthetic: true },
        result,
    );
    return (
        <div className="space-y-6">
            <FilterPanel
                iconOnly
                title="Filter Mapping Area"
                summary={`${periodLabel} · Realisasi DO`}
            >
                <MonthRangeFields
                    id="mapping-period"
                    from={from}
                    to={to}
                    onChange={(start, end) => {
                        setFrom(start);
                        setTo(end);
                        if (!monthRangeError(start, end))
                            setApplied({ from: start, to: end });
                    }}
                />
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Berdasarkan DO sah, satu kali per transaksi. FOA mengikuti
                    kondisi yang dikunci saat DO.
                </p>
            </FilterPanel>
            <section
                aria-label="Ringkasan Mapping Area"
                className="grid grid-cols-2 gap-x-6 gap-y-5 border-y py-5 sm:gap-x-10 lg:grid-cols-4"
            >
                {[
                    {
                        label: 'Total DO',
                        value: result.total,
                        hint: periodLabel,
                    },
                    {
                        label: 'Dalam FOA',
                        value: result.foa,
                        hint:
                            percentage(result.foa, result.total) +
                            ' dari seluruh DO',
                    },
                    {
                        label: 'Area lain',
                        value: result.other,
                        hint: 'Kecamatan non-FOA dan Kota Lain',
                    },
                    {
                        label: 'Belum diisi',
                        value: result.unknown,
                        hint: 'Kecamatan belum tercatat',
                    },
                ].map((metric) => (
                    <div key={metric.label} className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                            {metric.value}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {metric.hint}
                        </p>
                    </div>
                ))}
            </section>
            {!result.total ? (
                <section className="rounded-xl border px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold">
                        Belum ada DO pada rentang ini
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Data contoh penjualan tersedia pada November 2026.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-5"
                        onClick={() => {
                            setFrom('2026-11');
                            setTo('2026-11');
                            setApplied({ from: '2026-11', to: '2026-11' });
                        }}
                    >
                        Lihat November 2026
                    </Button>
                </section>
            ) : (
                <>
                    <section
                        aria-labelledby="mapping-chart-title"
                        className="rounded-xl border bg-card p-5 sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2
                                    id="mapping-chart-title"
                                    className="font-semibold"
                                >
                                    Penjualan berdasarkan area
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {periodLabel} · Realisasi DO ·{' '}
                                    {result.total} transaksi
                                </p>
                            </div>
                            <ChartExportMenu chart={chart} />
                        </div>
                        <div className="grid items-center gap-8 py-7 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                            <div className="flex justify-center">
                                <svg
                                    viewBox="0 0 200 200"
                                    role="img"
                                    aria-label={result.rows
                                        .map(
                                            (row) =>
                                                `${row.name}: ${row.count} DO, ${percentage(row.count, result.total)}`,
                                        )
                                        .join('. ')}
                                    className="h-auto w-full max-w-80"
                                >
                                    {result.rows.map((row, index) => {
                                        if (!row.count) return null;
                                        const start =
                                            -Math.PI / 2 +
                                            (result.rows
                                                .slice(0, index)
                                                .reduce(
                                                    (sum, item) =>
                                                        sum + item.count,
                                                    0,
                                                ) /
                                                result.total) *
                                                Math.PI *
                                                2;
                                        const sweep =
                                            (row.count / result.total) *
                                            Math.PI *
                                            2;
                                        const end = start + sweep;
                                        const middle = start + sweep / 2;
                                        const x = 100 + Math.cos(middle) * 57;
                                        const y = 100 + Math.sin(middle) * 57;
                                        const showName =
                                            row.count / result.total >= 0.15;
                                        const label =
                                            row.category === 'foa'
                                                ? row.districtName
                                                : row.category === 'other'
                                                  ? 'Area lain'
                                                  : 'Belum diisi';
                                        return (
                                            <g key={row.id}>
                                                {row.count === result.total ? (
                                                    <circle
                                                        cx="100"
                                                        cy="100"
                                                        r="96"
                                                        fill={chartRowColor(
                                                            'area',
                                                            row.id,
                                                        )}
                                                    />
                                                ) : (
                                                    <path
                                                        d={`M 100 100 L ${100 + 96 * Math.cos(start)} ${100 + 96 * Math.sin(start)} A 96 96 0 ${sweep > Math.PI ? 1 : 0} 1 ${100 + 96 * Math.cos(end)} ${100 + 96 * Math.sin(end)} Z`}
                                                        fill={chartRowColor(
                                                            'area',
                                                            row.id,
                                                        )}
                                                        stroke="white"
                                                        strokeWidth="1"
                                                    />
                                                )}
                                                {row.count / result.total >=
                                                    0.04 && (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        textAnchor="middle"
                                                        fill="white"
                                                        fontSize="8"
                                                        fontWeight="600"
                                                    >
                                                        {showName && (
                                                            <tspan
                                                                x={x}
                                                                dy="-3"
                                                            >
                                                                {label}
                                                            </tspan>
                                                        )}
                                                        <tspan
                                                            x={x}
                                                            dy={
                                                                showName
                                                                    ? '11'
                                                                    : '3'
                                                            }
                                                        >
                                                            {percentage(
                                                                row.count,
                                                                result.total,
                                                            )}
                                                        </tspan>
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                            <dl className="space-y-4">
                                {result.rows.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex items-start gap-3 text-sm"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="mt-1.5 size-2.5 shrink-0 rounded-sm"
                                            style={{
                                                background: chartRowColor(
                                                    'area',
                                                    row.id,
                                                ),
                                            }}
                                        />
                                        <dt className="min-w-0 flex-1 leading-6 wrap-break-word">
                                            {row.name}
                                        </dt>
                                        <dd className="flex shrink-0 gap-3 leading-6 tabular-nums">
                                            <span className="font-medium">
                                                {row.count}
                                            </span>
                                            <span className="w-14 text-right text-muted-foreground">
                                                {percentage(
                                                    row.count,
                                                    result.total,
                                                )}
                                            </span>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
                            Area lain mencakup seluruh kecamatan non-FOA dan
                            Kota Lain. Kecamatan yang belum tercatat ditampilkan
                            terpisah. Persentase dihitung dari seluruh DO sah.
                        </p>
                    </section>
                    <section
                        aria-labelledby="mapping-detail-title"
                        className="overflow-hidden rounded-xl border bg-card"
                    >
                        <div className="px-5 py-4">
                            <h2
                                id="mapping-detail-title"
                                className="font-semibold"
                            >
                                Rincian penjualan
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Pengelompokan mengikuti snapshot saat DO, bukan
                                daftar FOA terbaru.
                            </p>
                        </div>
                        <div className="md:hidden">
                            {result.rows.map((row) => (
                                <div
                                    key={row.id}
                                    className="striped-row px-5 py-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="min-w-0 text-sm leading-6 font-medium">
                                            {row.name}
                                        </p>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                                            {row.count} DO
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {row.category === 'foa'
                                            ? 'FOA'
                                            : row.category === 'other'
                                              ? 'Non-FOA'
                                              : 'Belum diisi'}{' '}
                                        · {percentage(row.count, result.total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <table className="hidden w-full table-fixed text-sm md:table">
                            <caption className="sr-only">
                                Rincian DO menurut kecamatan FOA dan area
                                lainnya
                            </caption>
                            <thead className="border-y text-xs text-muted-foreground">
                                <tr>
                                    <th
                                        scope="col"
                                        className="w-[28%] px-5 py-3 text-left font-medium"
                                    >
                                        Kecamatan
                                    </th>
                                    <th
                                        scope="col"
                                        className="w-[30%] px-3 py-3 text-left font-medium"
                                    >
                                        Kabupaten/Kota
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-3 py-3 text-left font-medium"
                                    >
                                        Kelompok
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-3 py-3 text-right font-medium"
                                    >
                                        DO
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right font-medium"
                                    >
                                        Porsi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.rows.map((row) => (
                                    <tr key={row.id} className="striped-row">
                                        <th
                                            scope="row"
                                            className="px-5 py-3 text-left font-normal wrap-break-word"
                                        >
                                            {row.districtName || row.name}
                                        </th>
                                        <td className="px-3 py-3 wrap-break-word">
                                            {row.regionName ||
                                                (row.category === 'other'
                                                    ? 'Gabungan'
                                                    : '—')}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.category === 'foa'
                                                ? 'FOA'
                                                : row.category === 'other'
                                                  ? 'Non-FOA'
                                                  : 'Belum diisi'}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {row.count}
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums">
                                            {percentage(
                                                row.count,
                                                result.total,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-between border-t px-5 py-4 text-sm font-semibold">
                            <span>Total DO sah</span>
                            <span className="tabular-nums">
                                {result.total} DO · 100%
                            </span>
                        </div>
                    </section>
                </>
            )}
            {canTryForm && (
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed px-5 py-4 sm:flex-row sm:items-center">
                    <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                        Preview pengisian area pada detail transaksi. Perubahan
                        sebelum DO tidak mengubah laporan penjualan yang sudah
                        tercatat.
                    </p>
                    <AreaTransactionPreview
                        deals={deals}
                        sampleIds={sampleIds}
                        foaCodes={foaCodes}
                        onSave={onUpdate}
                    />
                </div>
            )}
        </div>
    );
}

export default function MappingAreaPreview() {
    const page = usePage();
    const role = page.props.auth.user.role;
    const isAdmin = role === 'admin';
    const [screen, setScreen] = useState(() =>
        isAdmin &&
        new URLSearchParams(page.url.split('?')[1] ?? '').get('screen') ===
            'master'
            ? 'master'
            : 'report',
    );
    const [foaCodes, setFoaCodes] = useState(
        () => new Set(initialFoaCodes(areaDistricts)),
    );
    const [deals, setDeals] = useState<AreaDeal[]>(initialDeals);
    const [revision, setRevision] = useState(0);
    return (
        <>
            <Head title={screen === 'master' ? 'Area & FOA' : 'Mapping Area'} />
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
                            Transaksi dan FOA adalah ilustrasi, bukan ketetapan
                            operasional dealer. Master wilayah memakai data
                            resmi.
                        </span>
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            setFoaCodes(
                                new Set(initialFoaCodes(areaDistricts)),
                            );
                            setDeals(initialDeals);
                            setRevision((value) => value + 1);
                        }}
                    >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Reset preview
                    </Button>
                </div>
                <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {screen === 'master'
                                    ? 'Area & FOA'
                                    : 'Mapping Area'}
                            </h1>
                            <Badge variant="secondary">Preview</Badge>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {screen === 'master'
                                ? 'Tentukan kecamatan yang menjadi sorotan dealer.'
                                : 'Sebaran penjualan berdasarkan kecamatan FOA dealer.'}
                        </p>
                    </div>
                    {isAdmin && (
                        <Button
                            variant="outline"
                            onClick={() =>
                                setScreen((value) =>
                                    value === 'report' ? 'master' : 'report',
                                )
                            }
                        >
                            {screen === 'master' && (
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            {screen === 'master'
                                ? 'Kembali ke Mapping Area'
                                : 'Kelola Area & FOA'}
                        </Button>
                    )}
                </header>
                <div key={revision}>
                    <div hidden={screen !== 'report'}>
                        <AreaReport
                            deals={deals}
                            foaCodes={foaCodes}
                            onUpdate={(deal) =>
                                setDeals((rows) =>
                                    rows.map((row) =>
                                        row.id === deal.id ? deal : row,
                                    ),
                                )
                            }
                            canTryForm={
                                role === 'admin' || role === 'supervisor'
                            }
                        />
                    </div>
                    {screen === 'master' && isAdmin && (
                        <AreaMaster foaCodes={foaCodes} onSave={setFoaCodes} />
                    )}
                </div>
                <p className="mt-8 border-t pt-4 text-xs leading-5 text-muted-foreground">
                    Perubahan hanya di browser dan hilang saat reload. PNG/CSV
                    diberi penanda Data contoh. Backend belum dihubungkan.
                </p>
            </div>
        </>
    );
}
