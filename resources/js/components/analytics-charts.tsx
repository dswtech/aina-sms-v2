import type { ReactNode } from 'react';

export type StageBuckets = {
    lead: number;
    spk: number;
    do: number;
};

export type ChartRow = {
    key: string;
    label: string;
    color: string;
    total: number;
    spk: number;
    do: number;
    furthest: StageBuckets | null;
};

const numberFormatter = new Intl.NumberFormat('id-ID');
const percentageFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 1,
});
const pct = (part: number, whole: number) =>
    `${percentageFormatter.format(whole ? (part / whole) * 100 : 0)}%`;

// Stage shades come from the theme's primary, so they follow light and dark mode.
export const stageColors = {
    lead: 'color-mix(in oklab, var(--muted-foreground) 18%, var(--card))',
    spk: 'color-mix(in oklab, var(--primary) 42%, var(--card))',
    do: 'var(--primary)',
};

export const sourcePalette = [
    'var(--primary)',
    'var(--chart-2)',
    'var(--chart-1)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export const OTHER_ROW_KEY = '__lainnya';

type Select = ((row: ChartRow) => void) | undefined;

// Mouse/touch shortcut to Drilldown; keyboard users reach the same rows through the tables' Drilldown buttons.
function clickable(row: ChartRow, onSelect: Select) {
    return onSelect && row.key !== OTHER_ROW_KEY
        ? {
              onClick: () => onSelect(row),
              className: 'cursor-pointer hover:opacity-80',
          }
        : {};
}

const hint = (row: ChartRow, onSelect: Select) =>
    onSelect && row.key !== OTHER_ROW_KEY ? ' · klik untuk drilldown' : '';

function shorten(value: string, max = 20) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function ChartPanel({
    id,
    title,
    description,
    className = '',
    children,
}: {
    id: string;
    title: string;
    description: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-labelledby={id}
            className={`min-w-0 rounded-xl border bg-card p-5 sm:p-6 print:hidden ${className}`}
        >
            <h3 id={id} className="font-semibold">
                {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-5">{children}</div>
        </section>
    );
}

export function ChartLegend({
    items,
}: {
    items: { label: string; color: string }[];
}) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {items.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                    <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: item.color }}
                        aria-hidden="true"
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

export function StageSummary({
    rows,
    acquisition,
}: {
    rows: ChartRow[];
    acquisition: boolean;
}) {
    const sum = (key: 'total' | 'spk' | 'do') =>
        rows.reduce((total, row) => total + row[key], 0);
    const total = sum('total');
    const steps = [
        {
            label: acquisition ? 'Lead' : 'Transaksi',
            value: total,
            color: stageColors.lead,
        },
        { label: 'SPK', value: sum('spk'), color: stageColors.spk },
        { label: 'DO', value: sum('do'), color: stageColors.do },
    ];

    return (
        <section aria-labelledby="analytics-summary-title" className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="analytics-summary-title" className="font-semibold">
                    Ringkasan tahap
                </h2>
                <p className="text-sm text-muted-foreground">
                    {acquisition
                        ? `Persentase = lanjut dari tahap sebelumnya · Conversion total ${pct(steps[2].value, total)}`
                        : 'Jumlah kejadian tahap pada periode ini.'}
                </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border bg-border md:grid-cols-3">
                {steps.map((step, index) => (
                    <div key={step.label} className="min-w-0 bg-secondary p-4">
                        <div className="flex items-start justify-between gap-2">
                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {step.label}
                            </dt>
                            {acquisition && index > 0 && (
                                <span className="rounded-full border bg-card px-2 text-xs font-semibold text-muted-foreground tabular-nums">
                                    → {pct(step.value, steps[index - 1].value)}
                                </span>
                            )}
                        </div>
                        <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                            {numberFormatter.format(step.value)}
                        </dd>
                        <div
                            className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
                            aria-hidden="true"
                        >
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: total
                                        ? `${(step.value / total) * 100}%`
                                        : 0,
                                    background: step.color,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </dl>
        </section>
    );
}

const outcomes = [
    { key: 'do', label: 'DO' },
    { key: 'spk', label: 'Berhenti di SPK' },
    { key: 'lead', label: 'Belum SPK' },
] as const;

// Pushes label centres apart so thin neighbouring nodes keep readable, single-line labels.
function spreadLabels(centres: number[], minGap = 18): number[] {
    let previous = -Infinity;
    return centres.map((centre) => {
        previous = Math.max(centre, previous + minGap);
        return previous;
    });
}

export function SourceFlow({
    rows,
    onSelect,
}: {
    rows: ChartRow[];
    onSelect?: (row: ChartRow) => void;
}) {
    const width = 720;
    const height = 340;
    const gap = 10;
    const nodeWidth = 12;
    const leftX = 180;
    const rightX = width - 200 - nodeWidth;
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const targets = outcomes
        .map((outcome) => ({
            outcome,
            value: rows.reduce(
                (sum, row) => sum + (row.furthest?.[outcome.key] ?? 0),
                0,
            ),
        }))
        .filter((target) => target.value > 0);
    const scale =
        (height - gap * (Math.max(rows.length, targets.length) - 1)) / total;

    let y = 0;
    const left = rows.map((row) => {
        const node = { row, y, h: row.total * scale, offset: 0 };
        y += node.h + gap;
        return node;
    });
    y = 0;
    const right = targets.map((target) => {
        const node = { ...target, y, h: target.value * scale, offset: 0 };
        y += node.h + gap;
        return node;
    });
    const links = left.flatMap((source) =>
        right.map((target) => {
            const value = source.row.furthest?.[target.outcome.key] ?? 0;
            const h = value * scale;
            const y0 = source.y + source.offset + h / 2;
            const y1 = target.y + target.offset + h / 2;
            source.offset += h;
            target.offset += h;
            return { source, target, value, h, y0, y1 };
        }),
    );
    const leftLabels = spreadLabels(left.map((node) => node.y + node.h / 2));
    const rightLabels = spreadLabels(right.map((node) => node.y + node.h / 2));
    const bottom = Math.max(height, ...leftLabels, ...rightLabels) + 10;
    const x0 = leftX + nodeWidth;
    const mid = (x0 + rightX) / 2;

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox={`0 -10 ${width} ${bottom + 10}`}
                className="w-full min-w-[560px]"
                role="img"
                aria-label={right
                    .map(
                        (node) =>
                            `${node.outcome.label}: ${node.value} lead (${pct(node.value, total)})`,
                    )
                    .join('. ')}
            >
                {links.map(
                    (link) =>
                        link.value > 0 && (
                            <path
                                key={`${link.source.row.key}-${link.target.outcome.key}`}
                                d={`M${x0},${link.y0} C${mid},${link.y0} ${mid},${link.y1} ${rightX},${link.y1}`}
                                fill="none"
                                stroke={link.source.row.color}
                                strokeWidth={Math.max(link.h, 1)}
                                strokeOpacity={0.4}
                                className={`transition-[stroke-opacity] hover:[stroke-opacity:0.75] ${onSelect ? 'cursor-pointer' : ''}`}
                                onClick={
                                    onSelect &&
                                    (() => onSelect(link.source.row))
                                }
                            >
                                <title>{`${link.source.row.label} → ${link.target.outcome.label}: ${link.value} lead${hint(link.source.row, onSelect)}`}</title>
                            </path>
                        ),
                )}
                {left.map((node, index) => (
                    <g key={node.row.key} {...clickable(node.row, onSelect)}>
                        <title>{`${node.row.label}: ${node.row.total} lead${hint(node.row, onSelect)}`}</title>
                        <rect
                            x={leftX}
                            y={node.y}
                            width={nodeWidth}
                            height={Math.max(node.h, 1)}
                            rx={3}
                            fill={node.row.color}
                        />
                        <text
                            x={leftX - 10}
                            y={leftLabels[index] + 4}
                            textAnchor="end"
                            fill="currentColor"
                            className="text-xs"
                        >
                            <tspan className="font-semibold">
                                {shorten(node.row.label)}
                            </tspan>
                            <tspan
                                fill="var(--muted-foreground)"
                                className="tabular-nums"
                            >
                                {` ${node.row.total}`}
                            </tspan>
                        </text>
                    </g>
                ))}
                {right.map((node, index) => (
                    <g key={node.outcome.key}>
                        <rect
                            x={rightX}
                            y={node.y}
                            width={nodeWidth}
                            height={Math.max(node.h, 1)}
                            rx={3}
                            fill={stageColors[node.outcome.key]}
                        />
                        <text
                            x={rightX + nodeWidth + 10}
                            y={rightLabels[index] + 4}
                            fill="currentColor"
                            className="text-xs"
                        >
                            <tspan className="font-semibold">
                                {node.outcome.label}
                            </tspan>
                            <tspan
                                fill="var(--muted-foreground)"
                                className="tabular-nums"
                            >
                                {` ${node.value} · ${pct(node.value, total)}`}
                            </tspan>
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

export function ShareDonut({
    rows,
    unit,
    onSelect,
}: {
    rows: ChartRow[];
    unit: string;
    onSelect?: (row: ChartRow) => void;
}) {
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const radius = 90;
    const point = (turn: number) => {
        const angle = turn * 2 * Math.PI - Math.PI / 2;
        return `${100 + radius * Math.cos(angle)} ${100 + radius * Math.sin(angle)}`;
    };
    let preceding = 0;

    return (
        <>
            <div className="flex flex-col items-center gap-2">
                <svg
                    viewBox="0 0 200 200"
                    className="size-48"
                    role="img"
                    aria-label={rows
                        .map(
                            (row) =>
                                `${row.label}: ${row.total} ${unit}, ${pct(row.total, total)}`,
                        )
                        .join('. ')}
                >
                    {rows.map((row) => {
                        const from = preceding / total;
                        preceding += row.total;
                        const to = preceding / total;
                        const title = (
                            <title>{`${row.label}: ${row.total} ${unit} (${pct(row.total, total)})${hint(row, onSelect)}`}</title>
                        );
                        // A single 100% slice cannot be drawn as an arc, so it is a plain circle.
                        return to - from >= 1 ? (
                            <circle
                                key={row.key}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill={row.color}
                                {...clickable(row, onSelect)}
                            >
                                {title}
                            </circle>
                        ) : (
                            <path
                                key={row.key}
                                d={`M100 100 L${point(from)} A${radius} ${radius} 0 ${to - from > 0.5 ? 1 : 0} 1 ${point(to)} Z`}
                                fill={row.color}
                                stroke="var(--card)"
                                strokeWidth={1.5}
                                strokeLinejoin="round"
                                {...clickable(row, onSelect)}
                            >
                                {title}
                            </path>
                        );
                    })}
                </svg>
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                        {numberFormatter.format(total)}
                    </span>{' '}
                    {unit}
                </p>
            </div>
            <dl className="mt-5 space-y-2.5">
                {rows.map((row) => (
                    <div
                        key={row.key}
                        className="flex items-center gap-3 text-sm"
                    >
                        <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{ background: row.color }}
                            aria-hidden="true"
                        />
                        <dt className="min-w-0 flex-1 truncate">
                            {onSelect ? (
                                <button
                                    type="button"
                                    className="max-w-full truncate rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Drilldown ${row.label}`}
                                    onClick={() => onSelect(row)}
                                >
                                    {row.label}
                                </button>
                            ) : (
                                row.label
                            )}
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {pct(row.total, total)}
                        </dd>
                    </div>
                ))}
            </dl>
        </>
    );
}

export function ConversionBars({
    rows,
    onSelect,
}: {
    rows: ChartRow[];
    onSelect?: (row: ChartRow) => void;
}) {
    const width = 860;
    const left = 170;
    const right = 130;
    const rowHeight = 40;
    const sorted = [...rows].sort(
        (a, b) => b.do / Math.max(b.total, 1) - a.do / Math.max(a.total, 1),
    );
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const average = total
        ? (rows.reduce((sum, row) => sum + row.do, 0) / total) * 100
        : 0;
    const highest = Math.max(
        average,
        ...sorted.map((row) => (row.do / Math.max(row.total, 1)) * 100),
    );
    const max = Math.max(10, Math.ceil(highest / 10) * 10);
    const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);
    const x = (value: number) => left + (value / max) * (width - left - right);
    const plotHeight = sorted.length * rowHeight;

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox={`0 -18 ${width} ${plotHeight + 42}`}
                className="w-full min-w-[560px]"
                role="img"
                aria-label={`Conversion rata-rata ${pct(average, 100)}. ${sorted
                    .map(
                        (row) =>
                            `${row.label}: ${pct(row.do, row.total)} (${row.do} dari ${row.total})`,
                    )
                    .join('. ')}`}
            >
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={x(tick)}
                            x2={x(tick)}
                            y1={0}
                            y2={plotHeight}
                            stroke="var(--border)"
                        />
                        <text
                            x={x(tick)}
                            y={plotHeight + 18}
                            textAnchor="middle"
                            fill="var(--muted-foreground)"
                            className="text-xs tabular-nums"
                        >
                            {percentageFormatter.format(tick)}%
                        </text>
                    </g>
                ))}
                {sorted.map((row, index) => {
                    const value = (row.do / Math.max(row.total, 1)) * 100;
                    const y = index * rowHeight;
                    return (
                        <g key={row.key} {...clickable(row, onSelect)}>
                            <rect
                                x={0}
                                y={y}
                                width={width}
                                height={rowHeight}
                                fill="transparent"
                            />
                            <text
                                x={left - 12}
                                y={y + 25}
                                textAnchor="end"
                                fill="currentColor"
                                className="text-xs font-semibold"
                            >
                                {shorten(row.label)}
                            </text>
                            <rect
                                x={left}
                                y={y + 10}
                                width={Math.max(x(value) - left, 1)}
                                height={20}
                                rx={4}
                                fill={row.color}
                            >
                                <title>{`${row.label}: ${pct(row.do, row.total)} (${row.do} DO dari ${row.total} lead)${hint(row, onSelect)}`}</title>
                            </rect>
                            <text
                                x={x(value) + 8}
                                y={y + 25}
                                fill="currentColor"
                                className="text-xs font-semibold tabular-nums"
                            >
                                {pct(row.do, row.total)}
                            </text>
                            <text
                                x={x(value) + 58}
                                y={y + 25}
                                fill="var(--muted-foreground)"
                                className="text-xs tabular-nums"
                            >
                                {row.do}/{row.total}
                            </text>
                        </g>
                    );
                })}
                <line
                    x1={x(average)}
                    x2={x(average)}
                    y1={-4}
                    y2={plotHeight}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                />
                <text
                    x={x(average) + 4}
                    y={-6}
                    fill="var(--muted-foreground)"
                    className="text-xs"
                >
                    rata-rata {pct(average, 100)}
                </text>
            </svg>
        </div>
    );
}

export type StageSegment = {
    key: string;
    label: string;
    color: string;
    value: (row: ChartRow) => number;
};

export const furthestSegments: StageSegment[] = [
    {
        key: 'do',
        label: 'DO',
        color: stageColors.do,
        value: (row) => row.furthest?.do ?? 0,
    },
    {
        key: 'spk',
        label: 'SPK (belum DO)',
        color: stageColors.spk,
        value: (row) => row.furthest?.spk ?? 0,
    },
    {
        key: 'lead',
        label: 'Belum SPK',
        color: stageColors.lead,
        value: (row) => row.furthest?.lead ?? 0,
    },
];

export const eventSegments: StageSegment[] = [
    { key: 'spk', label: 'SPK', color: stageColors.spk, value: (r) => r.spk },
    { key: 'do', label: 'DO', color: stageColors.do, value: (r) => r.do },
];

export function StageBars({
    rows,
    segments,
    unit,
    width = 860,
    onSelect,
}: {
    rows: ChartRow[];
    segments: StageSegment[];
    unit: string;
    width?: number;
    onSelect?: (row: ChartRow) => void;
}) {
    const left = 170;
    const right = 110;
    const rowHeight = 38;
    const sums = rows.map((row) =>
        segments.reduce((sum, segment) => sum + segment.value(row), 0),
    );
    // The merged "Lainnya" row would otherwise set the scale and shrink every named row.
    const named = sums.filter((_, i) => rows[i].key !== OTHER_ROW_KEY);
    const max = Math.max(1, ...(named.length ? named : sums));
    const plotWidth = width - left - right;
    const scale = plotWidth / max;
    const plotHeight = rows.length * rowHeight;

    return (
        <div className="space-y-4">
            <ChartLegend items={segments} />
            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${plotHeight}`}
                    className="w-full min-w-[560px]"
                    role="img"
                    aria-label={rows
                        .map(
                            (row) =>
                                `${row.label}: ${segments
                                    .map(
                                        (segment) =>
                                            `${segment.label} ${segment.value(row)}`,
                                    )
                                    .join(', ')}`,
                        )
                        .join('. ')}
                >
                    {rows.map((row, index) => {
                        const y = index * rowHeight;
                        let x = left;
                        return (
                            <g key={row.key} {...clickable(row, onSelect)}>
                                <rect
                                    x={0}
                                    y={y}
                                    width={width}
                                    height={rowHeight}
                                    fill="transparent"
                                />
                                <text
                                    x={left - 12}
                                    y={y + 23}
                                    textAnchor="end"
                                    fill="currentColor"
                                    className="text-xs font-semibold"
                                >
                                    {shorten(row.label)}
                                </text>
                                {segments.map((segment) => {
                                    const value = segment.value(row);
                                    const start = x;
                                    x = Math.min(
                                        x + value * scale,
                                        left + plotWidth,
                                    );
                                    return (
                                        value > 0 &&
                                        x > start && (
                                            <rect
                                                key={segment.key}
                                                x={start}
                                                y={y + 8}
                                                width={x - start}
                                                height={22}
                                                fill={segment.color}
                                                fillOpacity={
                                                    row.key === OTHER_ROW_KEY
                                                        ? 0.45
                                                        : undefined
                                                }
                                            >
                                                <title>{`${row.label} · ${segment.label}: ${value}${hint(row, onSelect)}`}</title>
                                            </rect>
                                        )
                                    );
                                })}
                                <text
                                    x={x + 10}
                                    y={y + 24}
                                    fill="currentColor"
                                    className="text-xs tabular-nums"
                                >
                                    <tspan className="font-semibold">
                                        {sums[index]}
                                    </tspan>
                                    <tspan fill="var(--muted-foreground)">
                                        {` ${unit}`}
                                    </tspan>
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
