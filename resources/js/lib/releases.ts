const releaseDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

/** `date` is a calendar date (YYYY-MM-DD); parse it as UTC so the day never shifts with the viewer's timezone. */
export function formatReleaseDate(date: string): string {
    return releaseDate.format(new Date(`${date}T00:00:00Z`));
}
