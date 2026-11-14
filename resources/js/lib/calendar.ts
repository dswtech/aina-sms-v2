export type CalendarView = 'month' | 'day';

export type CalendarItem = {
    id: string;
    kind: 'plan' | 'done';
    type: string;
    type_label: string;
    user_id: number;
    date: string;
    time: string;
    customer: string;
    customer_id: string | null;
    notes: string;
    overdue: boolean;
    /** Plans are pending or completed; activities are always completed. */
    status: 'pending' | 'completed';
    follow_up_id: number | null;
};

export type ItemVariant = 'real' | 'plan' | 'late' | 'completed';

export const FIRST_HOUR = 7;
export const LAST_HOUR = 21;

const LETTERS: Record<string, string> = {
    plan: 'R',
    call: 'T',
    whatsapp: 'W',
    visit: 'K',
    meeting: 'M',
    note: 'C',
};

export function isOpenPlan(item: CalendarItem): boolean {
    return item.kind === 'plan' && item.status === 'pending';
}

export function letterOf(item: CalendarItem): string {
    if (item.kind === 'plan' && item.status === 'completed') {
        return '✓';
    }

    return LETTERS[item.type] ?? '•';
}

export function variantOf(item: CalendarItem): ItemVariant {
    if (item.overdue) {
        return 'late';
    }

    if (item.kind === 'done') {
        return 'real';
    }

    return item.status === 'completed' ? 'completed' : 'plan';
}

export function kindLabel(item: CalendarItem): string {
    if (item.kind === 'done') {
        return `Realisasi · ${item.type_label}`;
    }

    return item.status === 'completed' ? 'Rencana · selesai' : 'Rencana';
}

// Dates are plain Y-m-d strings in Jakarta time; treat them as UTC so the browser zone never shifts them.
function toDate(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);

    return new Date(Date.UTC(y, m - 1, d));
}

function toKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
    return toDate(date).getUTCDay();
}

export function isWeekend(date: string): boolean {
    const day = dayOfWeek(date);

    return day === 0 || day === 6;
}

export function monthDays(date: string): string[] {
    const first = toDate(date.slice(0, 8) + '01');
    const days: string[] = [];

    for (
        const d = new Date(first);
        d.getUTCMonth() === first.getUTCMonth();
        d.setUTCDate(d.getUTCDate() + 1)
    ) {
        days.push(toKey(d));
    }

    return days;
}

/** Full Monday-first weeks covering the month of `date`. */
export function weekGrid(date: string): { date: string; inMonth: boolean }[] {
    const days = monthDays(date);
    const start = toDate(days[0]);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    const end = toDate(days[days.length - 1]);
    end.setUTCDate(end.getUTCDate() + ((7 - end.getUTCDay()) % 7));
    const month = date.slice(0, 7);
    const cells: { date: string; inMonth: boolean }[] = [];

    for (const d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = toKey(d);
        cells.push({ date: key, inMonth: key.startsWith(month) });
    }

    return cells;
}

export function shiftDate(
    date: string,
    view: CalendarView,
    delta: number,
): string {
    const d = toDate(date);

    if (view === 'day') {
        d.setUTCDate(d.getUTCDate() + delta);

        return toKey(d);
    }

    return toKey(
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)),
    );
}

export function formatMonth(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(toDate(date));
}

export function formatDay(
    date: string,
    options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    },
): string {
    return new Intl.DateTimeFormat('id-ID', {
        ...options,
        timeZone: 'UTC',
    }).format(toDate(date));
}

export function weekdayLetter(date: string): string {
    return 'MSSRKJS'[dayOfWeek(date)];
}

export function groupItems(
    items: CalendarItem[],
    key: (item: CalendarItem) => string,
): Map<string, CalendarItem[]> {
    const groups = new Map<string, CalendarItem[]>();

    for (const item of items) {
        const k = key(item);
        groups.set(k, [...(groups.get(k) ?? []), item]);
    }

    return groups;
}

/** Hour column for the day grid; items outside the visible range stick to its edges. */
export function hourSlot(time: string): { hour: number; edge: boolean } {
    const hour = Number(time.slice(0, 2));
    const clamped = Math.min(LAST_HOUR, Math.max(FIRST_HOUR, hour));

    return { hour: clamped, edge: clamped !== hour };
}

export function sortForTooltip(items: CalendarItem[]): CalendarItem[] {
    return [...items].sort(
        (a, b) =>
            Number(b.overdue) - Number(a.overdue) ||
            a.time.localeCompare(b.time),
    );
}

export type CellSummary = {
    label: string;
    variant: ItemVariant | 'mix';
    many: boolean;
    realCount: number;
    planCount: number;
    lateCount: number;
    realPercent: number;
};

export function summarize(items: CalendarItem[]): CellSummary {
    const realCount = items.filter((item) => item.kind === 'done').length;
    const planCount = items.length - realCount;
    const lateCount = items.filter((item) => item.overdue).length;
    const many = items.length > 1;

    return {
        label: many
            ? items.length > 9
                ? '9+'
                : String(items.length)
            : letterOf(items[0]),
        variant: !many
            ? variantOf(items[0])
            : realCount && planCount
              ? 'mix'
              : planCount
                ? 'plan'
                : 'real',
        many,
        realCount,
        planCount,
        lateCount,
        realPercent: items.length
            ? Math.round((realCount / items.length) * 100)
            : 0,
    };
}
