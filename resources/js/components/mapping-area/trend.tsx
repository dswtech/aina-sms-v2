import { chartRowColor } from '@/lib/chart-export';
import type { AreaReportData } from '@/lib/chart-export';
import { formatShare } from '@/lib/area-map';

const series = [
    {
        key: 'pma',
        label: 'PMA',
        color: chartRowColor('area-share', 'pmaOutsideFoa'),
        dash: '5 4',
        labelOffset: -9,
    },
    {
        key: 'foa',
        label: 'FOA',
        color: chartRowColor('area-share', 'foa'),
        dash: undefined,
        labelOffset: 18,
    },
] as const;
const shortMonth = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
});
const monthLabel = (month: string) =>
    shortMonth.format(new Date(`${month}-01T00:00:00Z`));
const step = 64;
const x = (index: number) => index * step + step / 2;
const share = (month: AreaReportData['months'][number], key: 'foa' | 'pma') =>
    (month[key] / month.total) * 100;
const y = (value: number) => 190 - value * 1.6;

export function Trend({ months }: { months: AreaReportData['months'] }) {
    return (
        <>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {series.map(({ key, label, color, dash }) => (
                    <li key={key} className="flex items-center gap-1.5">
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 4"
                            className="h-1 w-6"
                        >
                            <line
                                x2="24"
                                y1="2"
                                y2="2"
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray={dash}
                            />
                        </svg>
                        {label}
                    </li>
                ))}
            </ul>
            {/* Fixed-width months scroll, opened at the newest one. */}
            <div
                className="mt-2 overflow-x-auto"
                ref={(node) => {
                    if (node) node.scrollLeft = node.scrollWidth;
                }}
            >
                <svg
                    aria-hidden="true"
                    width={months.length * step}
                    height="234"
                    className="block max-w-none fill-muted-foreground text-[11px] tabular-nums"
                >
                    <line
                        x2="100%"
                        y1={y(0)}
                        y2={y(0)}
                        className="stroke-border"
                    />
                    {/* Lines first, so no line crosses a label. A month without DO breaks the line. */}
                    {series.map(({ key, color, dash }) =>
                        months
                            .slice(1)
                            .map((month, i) =>
                                months[i].total && month.total ? (
                                    <line
                                        key={`${key}-${month.month}`}
                                        x1={x(i)}
                                        y1={y(share(months[i], key))}
                                        x2={x(i + 1)}
                                        y2={y(share(month, key))}
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeDasharray={dash}
                                    />
                                ) : null,
                            ),
                    )}
                    {series.map(({ key, color, labelOffset }) =>
                        months.map((month, i) =>
                            month.total ? (
                                <g key={`${key}-${month.month}`}>
                                    <circle
                                        cx={x(i)}
                                        cy={y(share(month, key))}
                                        r="4"
                                        fill={color}
                                    />
                                    <text
                                        x={x(i)}
                                        y={y(share(month, key)) + labelOffset}
                                        textAnchor="middle"
                                        strokeWidth="3"
                                        className="stroke-card [paint-order:stroke]"
                                    >
                                        {formatShare(month[key], month.total)}
                                    </text>
                                </g>
                            ) : null,
                        ),
                    )}
                    {months.map((month, i) => (
                        <text
                            key={month.month}
                            x={x(i)}
                            y="228"
                            textAnchor="middle"
                        >
                            {monthLabel(month.month)}
                        </text>
                    ))}
                </svg>
            </div>
            <ol className="sr-only">
                {months.map((month) => (
                    <li key={month.month}>
                        {monthLabel(month.month)}:{' '}
                        {month.total
                            ? `FOA ${formatShare(month.foa, month.total)}, PMA ${formatShare(month.pma, month.total)} dari ${month.total} DO`
                            : 'belum ada DO'}
                    </li>
                ))}
            </ol>
        </>
    );
}
