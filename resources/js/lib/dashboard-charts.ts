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
