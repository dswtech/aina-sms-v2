export function scaled(value: string): number | null {
    const normalized = value.replace(',', '.');
    if (!/^\d+(\.\d{1,4})?$/.test(normalized)) return null;
    const [whole, fraction = ''] = normalized.split('.');
    const result = Number(whole) * 10000 + Number(fraction.padEnd(4, '0'));
    return Number.isSafeInteger(result) && result <= 1100000000 ? result : null;
}

export function benchmark(base: string, markup: string): number | null {
    const units = scaled(base);
    const percent = scaled(markup);
    if (
        units === null ||
        percent === null ||
        units > 100000000 ||
        percent > 10000000
    )
        return null;
    return Math.ceil((units * (1000000 + percent)) / 1000000);
}

export function equalShare(units: number, count: number): string | null {
    return count > 0 ? String(Math.ceil(units / count) / 10000) : null;
}

export function prorata(
    units: number,
    count: number,
    remaining: number,
    total: number,
): string | null {
    return count > 0 && total > 0
        ? String(Math.ceil((units * remaining) / (count * total)) / 10000)
        : null;
}
