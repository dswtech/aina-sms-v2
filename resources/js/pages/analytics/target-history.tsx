import { Head, router, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { FilterPanel } from '@/components/filter-panel';
import InputError from '@/components/input-error';
import { MonthRangeFields } from '@/components/month-range-fields';
import { formatMonthRange, monthRangeError } from '@/lib/month-range';

type Percents = {
    achievement_percent: number | null;
    benchmark_achievement_percent: number | null;
};
type Cell = Percents & {
    expected: boolean;
    target_units: number | null;
    benchmark_units: number | null;
    realization_units: number;
    teams_filled?: number;
    teams_required?: number;
};
type Row = {
    id: string | number;
    name: string;
    cells: Record<string, Cell>;
    average: Percents;
};
type TeamRow = Row & { is_active: boolean; sales: Row[] };
type Report = {
    from: string;
    to: string;
    currentMonth: string;
    months: string[];
    averageMonths: string[];
    dealer: Row | null;
    unassigned: Row | null;
    teams: TeamRow[];
};

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });
const percent = (value: number) => `${number.format(value)}%`;
const shortMonth = (month: string) =>
    new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(`${month}-01T00:00:00+07:00`));

function CellContent({ cell, plain }: { cell: Cell; plain?: boolean }) {
    if (plain) return <span>{number.format(cell.realization_units)}</span>;
    // No target was owed: the team or the membership did not exist that month.
    if (!cell.expected && cell.target_units === null)
        return (
            <span>
                {cell.realization_units
                    ? number.format(cell.realization_units)
                    : '–'}
            </span>
        );
    const incomplete =
        cell.target_units === null &&
        !!cell.teams_required &&
        cell.teams_filled! < cell.teams_required;
    return (
        <div className="grid gap-0.5">
            <span>
                {number.format(cell.realization_units)}
                {cell.target_units !== null &&
                    ` / ${number.format(cell.target_units)}`}
            </span>
            {cell.target_units === null ? (
                <span className="text-xs text-muted-foreground">
                    Belum diisi
                </span>
            ) : (
                cell.achievement_percent !== null && (
                    <span className="font-medium">
                        {percent(cell.achievement_percent)}
                    </span>
                )
            )}
            {incomplete && (
                <span className="text-xs text-muted-foreground">
                    {cell.teams_filled} dari {cell.teams_required} tim terisi
                </span>
            )}
            {cell.benchmark_units !== null && (
                <span className="text-xs text-muted-foreground">
                    Benchmark {number.format(cell.benchmark_units)}
                    {cell.benchmark_achievement_percent !== null &&
                        ` · ${percent(cell.benchmark_achievement_percent)}`}
                </span>
            )}
        </div>
    );
}

function DataCells({
    row,
    report,
    plain,
}: {
    row: Row;
    report: Report;
    plain?: boolean;
}) {
    return (
        <>
            {report.months.map((month) => (
                <td
                    key={month}
                    className="px-3 py-3 text-right align-top whitespace-nowrap tabular-nums"
                >
                    <CellContent cell={row.cells[month]} plain={plain} />
                </td>
            ))}
            <td className="px-5 py-3 text-right align-top whitespace-nowrap tabular-nums">
                <span className="font-medium">
                    {row.average.achievement_percent === null
                        ? '–'
                        : percent(row.average.achievement_percent)}
                </span>
                {row.average.benchmark_achievement_percent !== null && (
                    <span className="block text-xs text-muted-foreground">
                        Benchmark{' '}
                        {percent(row.average.benchmark_achievement_percent)}
                    </span>
                )}
            </td>
        </>
    );
}

// Sticky cells need an opaque background so months scroll underneath.
const nameCell =
    'sticky left-0 z-10 w-36 min-w-36 bg-card px-5 text-left break-words sm:w-64 sm:min-w-64';

export default function TargetHistoryPage({ report }: { report: Report }) {
    const { auth, errors } = usePage().props;
    const [from, setFrom] = useState(report.from);
    const [to, setTo] = useState(report.to);
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const isOpen = (id: string | number) =>
        open[id] ?? auth.user.role === 'supervisor';
    const { dealer, unassigned, averageMonths } = report;
    const averageLabel =
        averageMonths.length === 0
            ? 'belum ada bulan selesai'
            : averageMonths.map(shortMonth).join(', ');
    return (
        <>
            <Head title="Riwayat Pencapaian Target" />
            <div className="mx-auto w-full max-w-screen-2xl min-w-0 flex-1 px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-12 lg:px-10">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Riwayat Pencapaian Target
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Realisasi DO terhadap target setiap bulan. Baris Sales
                        mengikuti tim pada transaksi dan rencana target bulan
                        itu.
                    </p>
                </header>
                <div className="space-y-6">
                    <FilterPanel
                        iconOnly
                        title="Filter Riwayat Target"
                        summary={formatMonthRange(report.from, report.to)}
                    >
                        <MonthRangeFields
                            id="target-history-period"
                            from={from}
                            to={to}
                            onChange={(start, end) => {
                                setFrom(start);
                                setTo(end);
                                if (!monthRangeError(start, end))
                                    router.get(
                                        '/analytics/target-history',
                                        { from: start, to: end },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    );
                            }}
                        />
                        <InputError
                            message={errors.to ?? errors.from}
                            className="mt-2"
                        />
                    </FilterPanel>
                    {report.teams.length === 0 ? (
                        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                            Belum ada tim untuk ditampilkan.
                        </p>
                    ) : (
                        <div
                            role="region"
                            aria-label="Tabel riwayat pencapaian target"
                            tabIndex={0}
                            className="min-w-0 overflow-x-auto rounded-xl border bg-card"
                        >
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b align-bottom text-xs text-muted-foreground">
                                        <th
                                            scope="col"
                                            className={`${nameCell} py-3 align-bottom font-medium`}
                                        >
                                            Tim / Sales
                                        </th>
                                        {report.months.map((month) => (
                                            <th
                                                key={month}
                                                scope="col"
                                                className="px-3 py-3 text-right font-medium whitespace-nowrap"
                                            >
                                                {shortMonth(month)}
                                                {month ===
                                                    report.currentMonth && (
                                                    <span className="block font-normal">
                                                        berjalan
                                                    </span>
                                                )}
                                            </th>
                                        ))}
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right font-medium whitespace-nowrap"
                                        >
                                            Rata-rata
                                            <span className="block font-normal">
                                                {averageLabel}
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {dealer && (
                                        <tr className="font-medium">
                                            <th
                                                scope="row"
                                                className={`${nameCell} py-3 align-top font-semibold`}
                                            >
                                                {dealer.name}
                                            </th>
                                            <DataCells
                                                row={dealer}
                                                report={report}
                                            />
                                        </tr>
                                    )}
                                    {report.teams.map((team) => (
                                        <Fragment key={team.id}>
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className={`${nameCell} py-1 align-top font-semibold`}
                                                >
                                                    {team.sales.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="-ml-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                                            aria-expanded={isOpen(
                                                                team.id,
                                                            )}
                                                            onClick={() =>
                                                                setOpen({
                                                                    ...open,
                                                                    [team.id]:
                                                                        !isOpen(
                                                                            team.id,
                                                                        ),
                                                                })
                                                            }
                                                        >
                                                            <ChevronRight
                                                                aria-hidden="true"
                                                                className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${isOpen(team.id) ? 'rotate-90' : ''}`}
                                                            />
                                                            {team.name}
                                                        </button>
                                                    ) : (
                                                        <span className="block py-2">
                                                            {team.name}
                                                        </span>
                                                    )}
                                                    {!team.is_active && (
                                                        <span className="block text-xs font-normal text-muted-foreground">
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                </th>
                                                <DataCells
                                                    row={team}
                                                    report={report}
                                                />
                                            </tr>
                                            {isOpen(team.id) &&
                                                team.sales.map((sales) => (
                                                    <tr key={sales.id}>
                                                        <th
                                                            scope="row"
                                                            className={`${nameCell} py-3 pl-9 align-top font-normal`}
                                                        >
                                                            {sales.name}
                                                        </th>
                                                        <DataCells
                                                            row={sales}
                                                            report={report}
                                                        />
                                                    </tr>
                                                ))}
                                        </Fragment>
                                    ))}
                                    {unassigned && (
                                        <tr>
                                            <th
                                                scope="row"
                                                className={`${nameCell} py-3 align-top font-medium`}
                                            >
                                                {unassigned.name}
                                            </th>
                                            <DataCells
                                                row={unassigned}
                                                report={report}
                                                plain
                                            />
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

TargetHistoryPage.layout = {
    breadcrumbs: [
        { title: 'Analisis', href: '/analytics' },
        { title: 'Riwayat Target', href: '/analytics/target-history' },
    ],
};
