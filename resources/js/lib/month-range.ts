export function monthRangeError(from: string, to: string): string | null {
    const valid = (value: string) =>
        /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith('0000');
    if (!valid(from) || !valid(to))
        return 'Pilih bulan awal dan bulan akhir yang valid.';
    return from > to
        ? 'Bulan akhir tidak boleh lebih awal dari bulan awal.'
        : null;
}

export function formatMonthRange(from: string, to: string): string {
    if (monthRangeError(from, to)) return 'Pilih rentang bulan';
    const formatter = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    });
    const format = (value: string) =>
        formatter.format(new Date(`${value}-01T00:00:00+07:00`));
    return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}
