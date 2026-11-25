import type { TimelineEvent } from '@/types/history';

const jakarta = (options: Intl.DateTimeFormatOptions, locale = 'id-ID') =>
    new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Jakarta', ...options });
const dayKey = jakarta({ dateStyle: 'short' }, 'en-CA');
const dayName = jakarta({ day: 'numeric', month: 'short', year: 'numeric' });
const clock = jakarta({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const chatTime = (value: string) => clock.format(new Date(value));

export function chatDay(value: string, now: Date = new Date()) {
    const key = dayKey.format(new Date(value));
    if (key === dayKey.format(now)) return 'Hari ini';
    if (key === dayKey.format(now.getTime() - 86_400_000)) return 'Kemarin';

    return dayName.format(new Date(value));
}

export type ChatRow = {
    event: TimelineEvent;
    /** Heading of a new Jakarta day; null while the day continues. */
    day: string | null;
    /** Same author directly before, on the same day: the name is not repeated. */
    continues: boolean;
};

export function chatRows(
    events: TimelineEvent[],
    now: Date = new Date(),
): ChatRow[] {
    return events.map((event, index) => {
        const previous = events[index - 1];
        const newDay =
            !previous ||
            dayKey.format(new Date(previous.occurred_at)) !==
                dayKey.format(new Date(event.occurred_at));

        return {
            event,
            day: newDay ? chatDay(event.occurred_at, now) : null,
            continues:
                !newDay &&
                !!event.comment &&
                !!previous.comment &&
                previous.actor_name === event.actor_name &&
                previous.comment.author_role === event.comment.author_role,
        };
    });
}
