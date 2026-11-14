import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    isOpenPlan,
    kindLabel,
    letterOf,
    sortForTooltip,
    summarize,
    variantOf,
    type CalendarItem,
    type CellSummary,
    type ItemVariant,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

const badgeVariant: Record<ItemVariant | 'mix', string> = {
    real: 'bg-primary text-primary-foreground',
    plan: 'border-[1.5px] border-dashed border-primary bg-card text-primary',
    late: 'border-[1.5px] border-dashed border-destructive bg-destructive/10 text-destructive',
    mix: 'border-[1.5px] border-dashed border-primary bg-card pb-[3px] text-primary',
    completed: 'border-[1.5px] border-primary/40 bg-card text-primary/70',
};

/** Opens the "Catat hasil / Batalkan" dialog for a pending plan; null when the page offers no actions. */
export const PlanActions = createContext<((item: CalendarItem) => void) | null>(
    null,
);

export function Badge({
    variant,
    label,
    large = false,
    summary,
}: {
    variant: ItemVariant | 'mix';
    label: string;
    large?: boolean;
    summary?: CellSummary;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative inline-flex shrink-0 items-center justify-center leading-none font-semibold',
                large
                    ? 'h-[34px] min-w-[34px] rounded-[9px] text-sm'
                    : 'h-[22px] min-w-[22px] rounded-md px-1 text-[11px]',
                summary?.many && 'rounded-[11px]',
                badgeVariant[variant],
            )}
        >
            {label}
            {variant === 'mix' && summary && (
                <span
                    className="absolute bottom-0 left-0 h-1 rounded-bl-[9px] bg-primary"
                    style={{ width: `${summary.realPercent}%` }}
                />
            )}
            {summary?.many && summary.lateCount > 0 && (
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-card bg-destructive" />
            )}
        </span>
    );
}

export function ItemBadge({
    item,
    large,
}: {
    item: CalendarItem;
    large?: boolean;
}) {
    return (
        <Badge variant={variantOf(item)} label={letterOf(item)} large={large} />
    );
}

export function SummaryBadge({ items }: { items: CalendarItem[] }) {
    const summary = summarize(items);

    return (
        <Badge
            variant={summary.variant}
            label={summary.label}
            summary={summary}
        />
    );
}

export function LateTag() {
    return (
        <span className="inline-flex items-center rounded-full border border-destructive bg-destructive/10 px-2 py-px text-[11px] font-semibold text-destructive">
            Terlambat
        </span>
    );
}

export function itemAria(item: CalendarItem): string {
    return `${item.time}, ${kindLabel(item)}, ${item.customer}${item.overdue ? ', terlambat' : ''}`;
}

function ItemLine({
    item,
    note,
    onAct,
}: {
    item: CalendarItem;
    note?: string;
    onAct?: (item: CalendarItem) => void;
}) {
    return (
        <div className="flex gap-2.5 border-t py-2 first:border-t-0">
            <ItemBadge item={item} />
            <div className="min-w-0 flex-1">
                <div className="font-semibold">
                    {kindLabel(item)} · {item.time}
                </div>
                <div className="text-muted-foreground">{item.customer}</div>
                {item.notes && (
                    <div className="mt-0.5 line-clamp-3">{item.notes}</div>
                )}
                {item.overdue && (
                    <div className="mt-1">
                        <LateTag />
                    </div>
                )}
                {note && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        {note}
                    </div>
                )}
                {onAct && isOpenPlan(item) && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => onAct(item)}
                    >
                        Catat hasil / batalkan
                    </Button>
                )}
            </div>
        </div>
    );
}

const TOOLTIP_LIMIT = 4;

function ItemList({
    items,
    note,
    limit,
    onAct,
}: {
    items: CalendarItem[];
    note?: (item: CalendarItem) => string | undefined;
    limit?: number;
    onAct?: (item: CalendarItem) => void;
}) {
    return sortForTooltip(items)
        .slice(0, limit)
        .map((item) => (
            <ItemLine
                key={item.id}
                item={item}
                note={note?.(item)}
                onAct={onAct}
            />
        ));
}

function summaryText(items: CalendarItem[]): string {
    const s = summarize(items);

    return `${s.realCount} Realisasi · ${s.planCount} Rencana${s.lateCount ? ` (${s.lateCount} terlambat)` : ''}`;
}

/**
 * Hover/focus tooltip on desktop; on touch screens a tap opens a bottom sheet with the same list.
 */
export function ItemsTrigger({
    title,
    items,
    ariaLabel,
    className,
    children,
    onOpenDay,
    note,
}: {
    title: string;
    items: CalendarItem[];
    ariaLabel: string;
    className?: string;
    children: ReactNode;
    onOpenDay?: () => void;
    note?: (item: CalendarItem) => string | undefined;
}) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const onPlan = useContext(PlanActions);
    const actionable =
        onPlan && items.length === 1 && isOpenPlan(items[0]) ? items[0] : null;
    const buttonClass = cn(
        'cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
    );

    if (isMobile) {
        return (
            <>
                <button
                    type="button"
                    className={buttonClass}
                    aria-label={ariaLabel}
                    onClick={() => setOpen(true)}
                >
                    {children}
                </button>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent
                        side="bottom"
                        className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl pb-5"
                    >
                        <SheetHeader className="pr-14">
                            <SheetTitle>{title}</SheetTitle>
                            <SheetDescription>
                                {items.length} kegiatan · {summaryText(items)}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="px-4 text-[12.5px] leading-snug">
                            <ItemList
                                items={items}
                                note={note}
                                onAct={
                                    onPlan
                                        ? (item) => {
                                              setOpen(false);
                                              onPlan(item);
                                          }
                                        : undefined
                                }
                            />
                        </div>
                        {onOpenDay && (
                            <div className="px-4 pt-3">
                                <Button className="w-full" onClick={onOpenDay}>
                                    Buka Harian
                                </Button>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>
            </>
        );
    }

    const hidden = items.length - TOOLTIP_LIMIT;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={buttonClass}
                    aria-label={ariaLabel}
                    onClick={
                        actionable
                            ? () => onPlan!(actionable)
                            : items.length > TOOLTIP_LIMIT
                              ? onOpenDay
                              : undefined
                    }
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    sideOffset={4}
                    collisionPadding={12}
                    className="z-50 w-[272px] rounded-xl border bg-popover p-3 text-xs leading-snug text-popover-foreground shadow-lg"
                >
                    <div className="pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {title}
                    </div>
                    {items.length > 1 && (
                        <div className="pb-1 text-[11.5px] text-muted-foreground">
                            {summaryText(items)}
                        </div>
                    )}
                    <ItemList items={items} note={note} limit={TOOLTIP_LIMIT} />
                    {hidden > 0 && (
                        <div className="mt-0.5 border-t pt-2 font-semibold text-primary">
                            +{hidden} lainnya · klik untuk Buka Harian
                        </div>
                    )}
                    {actionable && (
                        <div className="mt-0.5 border-t pt-2 font-semibold text-primary">
                            Klik untuk mencatat hasil atau membatalkan
                        </div>
                    )}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </Tooltip>
    );
}

export function Legend({ mix = false }: { mix?: boolean }) {
    return (
        <ul
            aria-label="Legenda"
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
        >
            <li className="flex items-center gap-1.5">
                <Badge variant="plan" label="R" />
                Rencana
            </li>
            <li className="flex items-center gap-1.5">
                <Badge variant="real" label="K" />
                Realisasi
            </li>
            {mix && (
                <li className="flex items-center gap-1.5">
                    <Badge
                        variant="mix"
                        label="3"
                        summary={{
                            label: '3',
                            variant: 'mix',
                            many: true,
                            realCount: 2,
                            planCount: 1,
                            lateCount: 0,
                            realPercent: 60,
                        }}
                    />
                    Campuran
                </li>
            )}
            <li className="flex items-center gap-1.5">
                <Badge variant="late" label="R" />
                Terlambat
            </li>
            <li className="flex items-center gap-1.5">
                <Badge variant="completed" label="✓" />
                Rencana selesai
            </li>
            <li className="flex items-center gap-1.5">
                <span
                    aria-hidden="true"
                    className="calendar-weekend size-[18px] rounded-[5px] border bg-muted/50"
                />
                Akhir pekan
            </li>
        </ul>
    );
}

export function EmptyState({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2.5 px-4 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                {icon}
            </span>
            <h3 className="mt-1.5 text-base font-semibold">{title}</h3>
            <p className="max-w-sm text-[13px] text-muted-foreground">
                {description}
            </p>
        </div>
    );
}
