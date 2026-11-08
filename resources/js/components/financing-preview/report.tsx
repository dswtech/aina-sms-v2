import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Info } from 'lucide-react';
import { FilterPanel } from '@/components/filter-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { summarizeFinancing } from '@/lib/financing-preview';
import type {
    FinancingDeal,
    FinancingMode,
    Leasing,
} from '@/lib/financing-preview';

const number = new Intl.NumberFormat('id-ID');
const percentage = (value: number, total: number) =>
    `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(total ? (value / total) * 100 : 0)}%`;

export function FinancingReport({
    deals,
    lenders,
    onTryForm,
}: {
    deals: FinancingDeal[];
    lenders: Leasing[];
    onTryForm?: () => void;
}) {
    const [period, setPeriod] = useState('2026-11');
    const [mode, setMode] = useState<FinancingMode>('prospect');
    const data = summarizeFinancing(deals, lenders, period, mode);
    const distribution = [
        { name: 'Cash', value: data.cash, color: 'var(--primary)' },
        { name: 'Kredit', value: data.credit, color: 'var(--foreground)' },
        {
            name: 'Belum ditentukan',
            value: data.unknown,
            color: 'var(--muted-foreground)',
        },
    ];
    const largest = Math.max(1, ...data.leasing.map((row) => row.count));
    const circumference = 2 * Math.PI * 80;
    const periodLabel = /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
        ? new Intl.DateTimeFormat('id-ID', {
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(`${period}-01T00:00:00+07:00`))
        : 'Pilih periode';
    const modeLabel = mode === 'prospect' ? 'Prospek' : 'Realisasi DO';

    return (
        <div className="space-y-6">
            <FilterPanel
                title="Filter pembiayaan"
                summary={`${periodLabel} · ${modeLabel}`}
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-6">
                    <div className="space-y-2 xl:w-48">
                        <Label htmlFor="financing-period">Periode</Label>
                        <Input
                            id="financing-period"
                            type="month"
                            min="2020-01"
                            max="2099-12"
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                        />
                    </div>
                    <fieldset className="min-w-0 space-y-2">
                        <legend className="mb-2 text-sm font-medium">
                            Dasar laporan
                        </legend>
                        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                            {(['prospect', 'do'] as const).map((value) => (
                                <Button
                                    key={value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        mode === value ? 'secondary' : 'ghost'
                                    }
                                    className={
                                        mode === value ? 'bg-background' : ''
                                    }
                                    aria-pressed={mode === value}
                                    onClick={() => setMode(value)}
                                >
                                    {value === 'prospect'
                                        ? 'Prospek'
                                        : 'Realisasi DO'}
                                </Button>
                            ))}
                        </div>
                    </fieldset>
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground xl:pb-1">
                        {mode === 'prospect'
                            ? 'Bulan pertama masuk Prospect, dengan pilihan pembiayaan terbaru.'
                            : 'Bulan DO yang sah, dengan pilihan pembiayaan yang dikunci saat DO.'}
                    </p>
                </div>
            </FilterPanel>

            <section
                aria-label="Ringkasan pembiayaan"
                className="grid grid-cols-2 gap-y-5 border-y py-5 lg:grid-cols-4"
            >
                {[
                    {
                        label: 'Total transaksi',
                        value: data.total,
                        hint: `${modeLabel} · ${periodLabel}`,
                    },
                    {
                        label: 'Cash',
                        value: data.cash,
                        hint: `${percentage(data.cash, data.total)} dari seluruh transaksi`,
                    },
                    {
                        label: 'Kredit',
                        value: data.credit,
                        hint: `${percentage(data.credit, data.total)} dari seluruh transaksi`,
                    },
                    {
                        label: 'Belum ditentukan',
                        value: data.unknown,
                        hint: 'Pilihan pembiayaan belum diisi',
                    },
                ].map((metric) => (
                    <div
                        key={metric.label}
                        className="min-w-0 px-3 first:pl-0 sm:px-5"
                    >
                        <p className="text-sm text-muted-foreground">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                            {number.format(metric.value)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {metric.hint}
                        </p>
                    </div>
                ))}
            </section>

            {data.total === 0 ? (
                <section className="rounded-xl border px-6 py-16 text-center">
                    <h2 className="text-lg font-semibold">
                        Belum ada transaksi pada periode ini
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Coba November 2026 untuk melihat kedua grafik dengan
                        data contoh.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-5"
                        onClick={() => setPeriod('2026-11')}
                    >
                        Lihat November 2026
                    </Button>
                </section>
            ) : (
                <>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
                        <section
                            aria-labelledby="financing-distribution-title"
                            className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
                        >
                            <h2
                                id="financing-distribution-title"
                                className="font-semibold"
                            >
                                Cara pembiayaan
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Komposisi dari {data.total} transaksi.
                            </p>
                            <div className="flex justify-center py-6">
                                <svg
                                    viewBox="0 0 200 200"
                                    role="img"
                                    aria-label={distribution
                                        .map(
                                            (row) =>
                                                `${row.name}: ${row.value} transaksi, ${percentage(row.value, data.total)}`,
                                        )
                                        .join('. ')}
                                    className="size-52 sm:size-56"
                                >
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="80"
                                        fill="none"
                                        stroke="var(--muted)"
                                        strokeWidth="30"
                                    />
                                    {distribution.map((row, index) => {
                                        const length =
                                            (row.value / data.total) *
                                            circumference;
                                        const preceding =
                                            (distribution
                                                .slice(0, index)
                                                .reduce(
                                                    (sum, segment) =>
                                                        sum + segment.value,
                                                    0,
                                                ) /
                                                data.total) *
                                            circumference;
                                        return (
                                            row.value > 0 && (
                                                <circle
                                                    key={row.name}
                                                    cx="100"
                                                    cy="100"
                                                    r="80"
                                                    fill="none"
                                                    stroke={row.color}
                                                    strokeWidth="30"
                                                    strokeDasharray={`${length} ${circumference - length}`}
                                                    strokeDashoffset={
                                                        -preceding
                                                    }
                                                    transform="rotate(-90 100 100)"
                                                />
                                            )
                                        );
                                    })}
                                    <text
                                        x="100"
                                        y="96"
                                        textAnchor="middle"
                                        fill="currentColor"
                                        className="text-3xl font-semibold"
                                    >
                                        {data.total}
                                    </text>
                                    <text
                                        x="100"
                                        y="118"
                                        textAnchor="middle"
                                        fill="var(--muted-foreground)"
                                        className="text-xs"
                                    >
                                        transaksi
                                    </text>
                                </svg>
                            </div>
                            <dl className="space-y-3">
                                {distribution.map((row) => (
                                    <div
                                        key={row.name}
                                        className="flex items-center gap-3 text-sm"
                                    >
                                        <span
                                            className="size-2.5 shrink-0 rounded-sm"
                                            style={{ background: row.color }}
                                            aria-hidden="true"
                                        />
                                        <dt className="flex-1">{row.name}</dt>
                                        <dd className="flex items-center gap-4 tabular-nums">
                                            <span className="font-medium">
                                                {row.value}
                                            </span>
                                            <span className="w-14 text-right text-muted-foreground">
                                                {percentage(
                                                    row.value,
                                                    data.total,
                                                )}
                                            </span>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                        <section
                            aria-labelledby="leasing-chart-title"
                            className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h2
                                        id="leasing-chart-title"
                                        className="font-semibold"
                                    >
                                        Leasing tujuan
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Dari {data.credit} transaksi dengan
                                        pembiayaan Kredit.
                                    </p>
                                </div>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <ArrowDown
                                        className="size-3"
                                        aria-hidden="true"
                                    />
                                    Jumlah terbanyak
                                </span>
                            </div>
                            {data.credit === 0 ? (
                                <p className="py-16 text-center text-sm text-muted-foreground">
                                    Belum ada transaksi Kredit pada periode ini.
                                </p>
                            ) : (
                                <div className="mt-6 space-y-3.5">
                                    {data.leasing.map((row) => (
                                        <div
                                            key={row.id}
                                            className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(4rem,1fr)_2rem]"
                                        >
                                            <span className="text-sm leading-5 sm:row-start-1">
                                                {row.name}
                                            </span>
                                            <span className="col-start-2 row-start-1 text-right text-sm font-medium tabular-nums sm:col-start-3">
                                                {row.count}
                                            </span>
                                            <div
                                                className="col-span-2 mt-1 h-2 rounded-sm bg-muted sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:h-3"
                                                aria-hidden="true"
                                            >
                                                <div
                                                    className={`h-full rounded-sm ${row.id === 'unselected' ? 'bg-muted-foreground' : 'bg-primary'}`}
                                                    style={{
                                                        width: `${(row.count / largest) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
                                Kredit Lain mencakup leasing di luar pantauan
                                utama. Leasing yang belum dipilih dihitung
                                terpisah.
                            </p>
                        </section>
                    </div>
                    {mode === 'prospect' &&
                        (data.unknown > 0 ||
                            data.leasing.some(
                                (row) =>
                                    row.id === 'unselected' && row.count > 0,
                            )) && (
                            <div className="flex flex-col gap-3 rounded-xl bg-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="flex items-start gap-3 text-sm leading-6">
                                    <Info
                                        className="mt-1 size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>
                                            {data.unknown +
                                                (data.leasing.find(
                                                    (row) =>
                                                        row.id === 'unselected',
                                                )?.count ?? 0)}{' '}
                                            transaksi belum lengkap.
                                        </strong>{' '}
                                        Pilihan dapat dilengkapi selama proses
                                        prospek.
                                    </span>
                                </p>
                                {onTryForm && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={onTryForm}
                                    >
                                        Coba form pembiayaan
                                        <ArrowUpRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                )}
                            </div>
                        )}
                    <section
                        aria-labelledby="leasing-table-title"
                        className="rounded-xl border bg-card"
                    >
                        <div className="px-5 py-4">
                            <h2
                                id="leasing-table-title"
                                className="font-semibold"
                            >
                                Rincian pembiayaan Kredit
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Persentase menggunakan total {data.credit}{' '}
                                transaksi Kredit.
                            </p>
                        </div>
                        <table className="w-full table-fixed text-sm">
                            <caption className="sr-only">
                                Jumlah dan persentase pembiayaan per leasing
                            </caption>
                            <thead className="border-y text-xs text-muted-foreground">
                                <tr>
                                    <th
                                        scope="col"
                                        className="w-1/2 px-5 py-3 text-left font-medium"
                                    >
                                        Leasing
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-right font-medium"
                                    >
                                        Transaksi
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
                                {data.leasing.map((row) => (
                                    <tr key={row.id} className="striped-row">
                                        <th
                                            scope="row"
                                            className="px-5 py-3 text-left font-normal wrap-break-word"
                                        >
                                            {row.name}
                                        </th>
                                        <td className="px-2 py-3 text-right tabular-nums">
                                            {row.count}
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums">
                                            {percentage(row.count, data.credit)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t font-semibold">
                                <tr>
                                    <th
                                        scope="row"
                                        className="px-5 py-4 text-left"
                                    >
                                        Total Kredit
                                    </th>
                                    <td className="px-2 py-4 text-right tabular-nums">
                                        {data.credit}
                                    </td>
                                    <td className="px-5 py-4 text-right tabular-nums">
                                        {percentage(data.credit, data.credit)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                </>
            )}
        </div>
    );
}
