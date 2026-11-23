type RankedPerformance = {
    name: string;
    realization_units: number;
    forecast_units: number | null;
};

export function rankPerformance<T extends RankedPerformance>(rows: T[]): T[] {
    return [...rows].sort(
        (a, b) =>
            b.realization_units - a.realization_units ||
            (b.forecast_units ?? -1) - (a.forecast_units ?? -1) ||
            a.name.localeCompare(b.name, 'id'),
    );
}

export function chartMaximum(values: (number | null | undefined)[]): number {
    return (
        values.reduce<number>(
            (maximum, value) => Math.max(maximum, value ?? 0),
            0,
        ) || 1
    );
}

export function chartWidth(value: number | null, maximum: number): number {
    return maximum > 0
        ? Math.min(100, Math.max(0, ((value ?? 0) / maximum) * 100))
        : 0;
}

export type PaceStatus =
    | 'on'
    | 'slipping'
    | 'behind'
    | 'reached'
    | 'none'
    | 'over';
export type Pace = {
    status: PaceStatus;
    label: string;
    needed: number | null;
    current: number | null;
    remainingUnits: number;
    remainingDays: number;
    summary: string | null;
};

export const paceLabels: Record<PaceStatus, string> = {
    on: 'Sesuai laju',
    slipping: 'Sedikit tertinggal',
    behind: 'Tertinggal',
    reached: 'Target tercapai',
    none: 'Target belum ditetapkan',
    over: 'Periode selesai',
};

const unit = (value: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);

/**
 * Monday–Saturday pace in Asia/Jakarta. `elapsed` already counts today when it is a workday,
 * so the remaining days (today included) are total − elapsed, plus today itself.
 */
export function monthPace(
    target: number | null,
    realized: number,
    workdays: { elapsed: number; total: number } | undefined,
    period: string,
    now: Date = new Date(),
): Pace {
    const base = {
        needed: null,
        current: null,
        remainingUnits: 0,
        remainingDays: 0,
    };
    const make = (
        status: PaceStatus,
        summary: string | null,
        extra = {},
    ): Pace => ({
        ...base,
        status,
        label: paceLabels[status],
        summary,
        ...extra,
    });
    if (!target) return make('none', null);
    if (realized >= target)
        return make(
            'reached',
            `${unit(realized)} dari ${unit(target)} unit (+${unit(realized - target)})`,
        );
    const jakarta = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        weekday: 'short',
    }).formatToParts(now);
    const part = (type: string) => jakarta.find((p) => p.type === type)?.value;
    const month = `${part('year')}-${part('month')}`;
    const periodMonth = period.slice(0, 7);
    const { elapsed = 0, total = 0 } = workdays ?? {};
    const remainingDays =
        periodMonth < month
            ? 0
            : periodMonth > month
              ? total
              : total -
                elapsed +
                (part('weekday') !== 'Sun' && elapsed > 0 ? 1 : 0);
    const remainingUnits = target - realized;
    if (remainingDays <= 0)
        return make(
            'over',
            `${unit(realized)} dari ${unit(target)} unit (kurang ${unit(remainingUnits)})`,
        );
    const needed = remainingUnits / remainingDays;
    const current = elapsed > 0 ? realized / elapsed : null;
    // Only a large shortfall gets the strong status, so the badge still separates people late in the month.
    const status =
        current !== null && current >= needed
            ? 'on'
            : current !== null && needed < current * 3
              ? 'slipping'
              : 'behind';
    return make(status, null, {
        needed,
        current,
        remainingUnits,
        remainingDays,
    });
}

/** Coaching order: furthest behind first, then on pace, reached, period over, and no target. */
export function rankByPace<T extends RankedPerformance>(
    rows: T[],
    paceOf: (row: T) => Pace,
): T[] {
    const order: Record<PaceStatus, number> = {
        behind: 0,
        slipping: 1,
        on: 2,
        over: 3,
        reached: 4,
        none: 5,
    };
    const shortfall = (p: Pace) => (p.needed ?? 0) - (p.current ?? 0);
    return [...rows].sort((a, b) => {
        const pa = paceOf(a);
        const pb = paceOf(b);
        return (
            order[pa.status] - order[pb.status] ||
            shortfall(pb) - shortfall(pa) ||
            a.name.localeCompare(b.name, 'id')
        );
    });
}
