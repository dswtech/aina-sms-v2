const relativeTime = new Intl.RelativeTimeFormat('id', { numeric: 'auto' });

export function formatRelativeTime(
    value: string | null,
    now: number = Date.now(),
): string {
    if (!value) {
        return '';
    }

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
        return '';
    }

    const minutes = Math.round((now - timestamp) / 60000);

    if (minutes < 1) {
        return 'Baru saja';
    }

    if (minutes < 60) {
        return relativeTime.format(-minutes, 'minute');
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
        return relativeTime.format(-hours, 'hour');
    }

    return relativeTime.format(-Math.round(hours / 24), 'day');
}

/** Rows saved before `kind` existed are coaching comments, so unknown kinds fall back to that label. */
export function kindLabel(kind: unknown): string {
    switch (kind) {
        case 'stage_changed':
            return 'Perubahan tahap';
        case 'stagnant':
        case 'stagnant_summary':
            return 'Stagnan';
        case 'release':
            return 'Rilis';
        default:
            return 'Komentar coaching';
    }
}
