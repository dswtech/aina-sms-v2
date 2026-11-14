import {
    formatDay,
    groupItems,
    isWeekend,
    kindLabel,
    variantOf,
    weekGrid,
    type CalendarItem,
    type ItemVariant,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { ItemsTrigger, LateTag, itemAria } from './parts';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const VISIBLE_LINES = 3;

const dotVariant: Record<ItemVariant, string> = {
    real: 'rounded-full bg-primary',
    plan: 'rounded-full border-2 border-primary bg-card',
    late: 'rounded-[2px] border-2 border-destructive bg-destructive/10',
    completed: 'rounded-full border-2 border-primary/40 bg-card',
};

function Dot({ item, small }: { item: CalendarItem; small?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-block shrink-0',
                small ? 'size-[7px] border-[1.5px]' : 'size-[9px]',
                dotVariant[variantOf(item)],
                small && variantOf(item) === 'real' && 'border-0',
            )}
        />
    );
}

/**
 * Personal month (Sales): Google-Calendar-like grid on desktop, dot grid + today's agenda on mobile.
 */
export function MonthGrid({
    date,
    today,
    items,
    onOpenDay,
}: {
    date: string;
    today: string;
    items: CalendarItem[];
    onOpenDay: (date: string) => void;
}) {
    const cells = weekGrid(date);
    const byDate = groupItems(items, (item) => item.date);
    const todayItems = byDate.get(today) ?? [];
    const showToday = today.slice(0, 7) === date.slice(0, 7);

    return (
        <>
            <section
                aria-label={`Kalender ${formatDay(date, { month: 'long', year: 'numeric' })}`}
                className="min-w-0 overflow-hidden rounded-[14px] border bg-card"
            >
                <div className="grid grid-cols-7">
                    {WEEKDAYS.map((day) => (
                        <div
                            key={day}
                            className="px-2 py-2.5 text-center text-[11.5px] font-semibold text-muted-foreground md:text-left"
                        >
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {cells.map((cell) => {
                        const dayItems = byDate.get(cell.date) ?? [];
                        const isToday = cell.date === today;
                        const label = `${formatDay(cell.date)}${isToday ? ' (hari ini)' : ''}: ${dayItems.length} kegiatan`;
                        const day = Number(cell.date.slice(8));

                        return (
                            <div
                                key={cell.date}
                                className={cn(
                                    'min-w-0 border-t border-l [&:nth-child(7n+1)]:border-l-0',
                                    isWeekend(cell.date) &&
                                        'calendar-weekend bg-muted/40',
                                    !cell.inMonth && 'opacity-50',
                                )}
                            >
                                {/* Mobile: whole cell opens the day. */}
                                <button
                                    type="button"
                                    onClick={() => onOpenDay(cell.date)}
                                    aria-label={label}
                                    className="flex min-h-14 w-full cursor-pointer flex-col items-center gap-1 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                                            isToday &&
                                                'bg-primary text-primary-foreground',
                                        )}
                                    >
                                        {day}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground"
                                    >
                                        {dayItems
                                            .slice(0, VISIBLE_LINES)
                                            .map((item) => (
                                                <Dot
                                                    key={item.id}
                                                    item={item}
                                                    small
                                                />
                                            ))}
                                        {dayItems.length > VISIBLE_LINES &&
                                            `+${dayItems.length - VISIBLE_LINES}`}
                                    </span>
                                </button>
                                <div className="hidden min-h-[132px] flex-col gap-0.5 p-1.5 md:flex">
                                    <button
                                        type="button"
                                        onClick={() => onOpenDay(cell.date)}
                                        aria-label={label}
                                        className={cn(
                                            'mb-0.5 flex size-6 cursor-pointer items-center justify-center rounded-full text-xs font-semibold outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
                                            isToday &&
                                                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                                        )}
                                    >
                                        {day}
                                    </button>
                                    {dayItems
                                        .slice(0, VISIBLE_LINES)
                                        .map((item) => (
                                            <ItemsTrigger
                                                key={item.id}
                                                title={formatDay(cell.date, {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                })}
                                                items={[item]}
                                                ariaLabel={itemAria(item)}
                                                className={cn(
                                                    'flex w-full min-w-0 items-center gap-1.5 px-1 py-0.5 text-left text-xs hover:bg-muted',
                                                    item.overdue &&
                                                        'text-destructive',
                                                )}
                                            >
                                                <Dot item={item} />
                                                <span className="font-semibold">
                                                    {item.time}
                                                </span>
                                                <span className="truncate">
                                                    {item.kind === 'plan'
                                                        ? 'Rencana'
                                                        : item.type_label}{' '}
                                                    – {item.customer}
                                                </span>
                                            </ItemsTrigger>
                                        ))}
                                    {dayItems.length > VISIBLE_LINES && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenDay(cell.date)}
                                            className="cursor-pointer self-start rounded px-1 text-xs font-semibold text-primary hover:underline"
                                        >
                                            +{dayItems.length - VISIBLE_LINES}{' '}
                                            lainnya
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
            {showToday && (
                <section
                    aria-label="Agenda hari ini"
                    className="rounded-[14px] border bg-card px-4 pt-3.5 pb-1.5 md:hidden"
                >
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <div>
                            <div className="text-sm font-semibold">
                                Hari ini ·{' '}
                                {formatDay(today, {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {todayItems.length
                                    ? `${todayItems.length} kegiatan`
                                    : 'Belum ada kegiatan'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onOpenDay(today)}
                            className="h-11 cursor-pointer rounded-lg border px-3.5 text-[13px] font-medium hover:bg-muted"
                        >
                            Buka Harian
                        </button>
                    </div>
                    {todayItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex gap-2.5 border-t py-2.5 text-[12.5px]"
                        >
                            <span className="mt-1">
                                <Dot item={item} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <span className="font-semibold">
                                    {item.time}
                                </span>{' '}
                                {kindLabel(item)} – {item.customer}
                                {item.overdue && (
                                    <div className="mt-1">
                                        <LateTag />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </section>
            )}
        </>
    );
}
