import { CalendarDays } from 'lucide-react';
import { Fragment, useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
    FIRST_HOUR,
    LAST_HOUR,
    groupItems,
    hourSlot,
    isOpenPlan,
    kindLabel,
    variantOf,
    type CalendarItem,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { EmptyState, ItemBadge, LateTag, PlanActions, itemAria } from './parts';

const HOURS = Array.from(
    { length: LAST_HOUR - FIRST_HOUR + 1 },
    (_, i) => FIRST_HOUR + i,
);

const cardVariant = {
    real: 'border',
    plan: 'border-[1.5px] border-dashed border-primary',
    late: 'border-[1.5px] border-dashed border-destructive bg-destructive/10',
    completed: 'border border-primary/40 opacity-80',
};

/**
 * Personal day (Sales): stats and an hourly agenda with full item cards.
 */
export function DayAgenda({
    items,
    now,
}: {
    items: CalendarItem[];
    /** HH:MM when the agenda shows today, otherwise null. */
    now: string | null;
}) {
    const byHour = groupItems(items, (item) =>
        String(hourSlot(item.time).hour),
    );
    const nowHour = now ? hourSlot(now).hour : null;
    const onPlan = useContext(PlanActions);
    const real = items.filter((item) => item.kind === 'done').length;
    const stats = [
        { label: 'Kegiatan', value: items.length },
        { label: 'Realisasi', value: real },
        { label: 'Rencana', value: items.length - real },
        {
            label: 'Terlambat',
            value: items.filter((item) => item.overdue).length,
            late: true,
        },
    ];

    return (
        <section
            aria-label="Agenda harian"
            className="w-full max-w-[920px] min-w-0 rounded-[14px] border bg-card px-3.5 pt-3.5 pb-1.5 sm:px-6 sm:pt-5 sm:pb-2.5"
        >
            {items.length === 0 ? (
                <EmptyState
                    icon={
                        <CalendarDays aria-hidden="true" className="size-6" />
                    }
                    title="Belum ada kegiatan di hari ini."
                    description="Rencana follow-up yang Anda jadwalkan untuk tanggal ini akan muncul di sini."
                />
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className={cn(
                                    'flex min-w-24 flex-col gap-0.5 rounded-[10px] bg-muted px-3.5 py-2.5',
                                    stat.late && 'bg-destructive/10',
                                )}
                            >
                                <b
                                    className={cn(
                                        'text-lg font-semibold',
                                        stat.late && 'text-destructive',
                                    )}
                                >
                                    {stat.value}
                                </b>
                                <span className="text-[11.5px] text-muted-foreground">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    {HOURS.map((hour) => {
                        const hourItems = byHour.get(String(hour)) ?? [];

                        return (
                            <Fragment key={hour}>
                                <div className="grid min-h-9 grid-cols-[64px_minmax(0,1fr)] gap-3 border-t first:border-t-0">
                                    <div className="pt-2 text-xs font-medium text-muted-foreground">
                                        {String(hour).padStart(2, '0')}:00
                                    </div>
                                    <div
                                        className={cn(
                                            'flex flex-col gap-2',
                                            hourItems.length && 'py-2',
                                        )}
                                    >
                                        {hourItems.map((item) => (
                                            <article
                                                key={item.id}
                                                aria-label={itemAria(item)}
                                                className={cn(
                                                    'flex items-start gap-3 rounded-xl bg-card px-3.5 py-3',
                                                    cardVariant[
                                                        variantOf(item)
                                                    ],
                                                )}
                                            >
                                                <ItemBadge item={item} large />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {item.time}
                                                        </span>
                                                        <span>
                                                            {kindLabel(item)}
                                                        </span>
                                                        {item.overdue && (
                                                            <LateTag />
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 text-sm font-semibold">
                                                        {item.customer}
                                                    </div>
                                                    {item.notes && (
                                                        <p className="mt-0.5 text-[13px] leading-normal whitespace-pre-line">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                    {onPlan &&
                                                        isOpenPlan(item) && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() =>
                                                                    onPlan(item)
                                                                }
                                                            >
                                                                Catat hasil /
                                                                batalkan
                                                            </Button>
                                                        )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                                {hour === nowHour && (
                                    <div
                                        role="note"
                                        className="-my-px flex items-center gap-2 text-[11.5px] font-semibold text-primary after:h-0.5 after:flex-1 after:rounded after:bg-primary"
                                    >
                                        Sekarang · {now}
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                </>
            )}
        </section>
    );
}
