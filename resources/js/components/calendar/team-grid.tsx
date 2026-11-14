import { useInitials } from '@/hooks/use-initials';
import {
    formatDay,
    groupItems,
    hourSlot,
    type CalendarItem,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { ItemBadge, ItemsTrigger, SummaryBadge, itemAria } from './parts';

export type CalendarRow = { id: number; name: string; team: string };

export type TeamColumn = {
    key: string;
    label: string;
    sub?: string;
    weekend: boolean;
    today: boolean;
    /** Day columns link to the daily view of that date. */
    date?: string;
};

/**
 * Sales × days (Bulanan) or sales × hours (Harian) for supervisors.
 */
export function TeamGrid({
    view,
    rows,
    columns,
    items,
    date,
    onOpenDay,
}: {
    view: 'month' | 'day';
    rows: CalendarRow[];
    columns: TeamColumn[];
    items: CalendarItem[];
    date: string;
    onOpenDay: (date: string) => void;
}) {
    const getInitials = useInitials();
    const keyOf = (item: CalendarItem) =>
        `${item.user_id}|${view === 'month' ? item.date : hourSlot(item.time).hour}`;
    const cells = groupItems(items, keyOf);
    const gridStyle = {
        gridTemplateColumns: `var(--name-w) repeat(${columns.length}, var(--col-w))`,
    };
    const gridVars =
        view === 'month'
            ? '[--col-w:44px] [--name-w:128px] sm:[--name-w:180px] xl:[--col-w:minmax(0,1fr)] xl:[--name-w:220px]'
            : '[--col-w:76px] [--name-w:128px] sm:[--name-w:180px] lg:[--col-w:minmax(0,1fr)] lg:[--name-w:220px]';

    return (
        <div className="overflow-x-auto pb-0.5">
            <div
                className={cn(
                    gridVars,
                    view === 'month'
                        ? 'w-max min-w-full xl:w-full'
                        : 'w-max min-w-full lg:w-full',
                )}
            >
                <div className="grid border-b" style={gridStyle}>
                    <div className="sticky left-0 z-10 flex items-center border-r bg-card px-3 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Sales
                    </div>
                    {columns.map((col) =>
                        col.date ? (
                            <button
                                key={col.key}
                                type="button"
                                onClick={() => onOpenDay(col.date!)}
                                aria-label={`Buka harian ${formatDay(col.date)}${col.today ? ' (hari ini)' : ''}`}
                                className={cn(
                                    'group flex h-[54px] cursor-pointer flex-col items-center justify-center gap-0.5 border-l text-[11px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    col.weekend &&
                                        'calendar-weekend bg-muted/40',
                                    col.today && 'text-primary',
                                )}
                            >
                                <span>{col.sub}</span>
                                <span
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-full text-[12.5px] font-semibold text-foreground group-hover:bg-accent group-hover:text-accent-foreground',
                                        col.today &&
                                            'bg-primary text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground',
                                    )}
                                >
                                    {col.label}
                                </span>
                            </button>
                        ) : (
                            <div
                                key={col.key}
                                className={cn(
                                    'flex min-h-11 items-center justify-center border-l text-[11.5px] font-medium text-muted-foreground',
                                    col.today && 'text-primary',
                                )}
                            >
                                {col.label}
                            </div>
                        ),
                    )}
                </div>
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="grid border-b last:border-b-0"
                        style={gridStyle}
                    >
                        <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r bg-card px-3 py-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                {getInitials(row.name)}
                            </span>
                            <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold">
                                    {row.name}
                                </div>
                                <div className="truncate text-[11.5px] text-muted-foreground">
                                    {row.team}
                                </div>
                            </div>
                        </div>
                        {columns.map((col) => {
                            const cellItems =
                                cells.get(`${row.id}|${col.key}`) ?? [];
                            const cellDate = col.date ?? date;
                            const title = `${formatDay(cellDate, { weekday: 'long', day: 'numeric', month: 'long' })}${view === 'day' ? ` · ${col.label}` : ''}`;

                            return (
                                <div
                                    key={col.key}
                                    className={cn(
                                        'flex min-h-12 flex-wrap items-center justify-center gap-1 border-l p-1',
                                        col.weekend &&
                                            'calendar-weekend bg-muted/40',
                                        col.today && 'bg-primary/7',
                                    )}
                                >
                                    {cellItems.length > 0 &&
                                        (view === 'month' ? (
                                            <ItemsTrigger
                                                title={`${row.name} · ${title}`}
                                                items={cellItems}
                                                ariaLabel={`${row.name}, ${title}: ${cellItems.length} kegiatan${cellItems.some((i) => i.overdue) ? ', ada yang terlambat' : ''}`}
                                                className="flex size-full min-h-11 items-center justify-center"
                                                onOpenDay={() =>
                                                    onOpenDay(cellDate)
                                                }
                                            >
                                                <SummaryBadge
                                                    items={cellItems}
                                                />
                                            </ItemsTrigger>
                                        ) : (
                                            cellItems.map((item) => (
                                                <ItemsTrigger
                                                    key={item.id}
                                                    title={`${row.name} · ${title}`}
                                                    items={[item]}
                                                    ariaLabel={`${row.name}, ${itemAria(item)}`}
                                                    className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-0.5 pr-2 pl-0.5 text-[11px] font-medium"
                                                    note={(i) =>
                                                        hourSlot(i.time).edge
                                                            ? 'Di luar rentang 07:00–21:00'
                                                            : undefined
                                                    }
                                                >
                                                    <ItemBadge item={item} />
                                                    <span className="truncate">
                                                        {item.time}
                                                    </span>
                                                </ItemsTrigger>
                                            ))
                                        ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
