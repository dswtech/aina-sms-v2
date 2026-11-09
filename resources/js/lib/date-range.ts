// ISO yyyy-mm-dd sorts lexicographically; an end date before the start is lifted to the start.
export function normalizeDateRange(from: string, to: string): [string, string] {
    return from && to && to < from ? [from, from] : [from, to];
}
