import { historyDate } from '@/components/transaction-timeline';
import { stageCutoffLabel } from '@/lib/transaction-detail';
import type { HistoryPage, TimelineEvent } from '@/types/history';

export function StageTimeline({
    page,
}: {
    page: HistoryPage<TimelineEvent> | null;
}) {
    if (!page) return null;
    const cutoff = stageCutoffLabel(page.data.length, page.total);

    return (
        <section aria-label="Pergerakan tahap">
            <h3 className="text-sm font-medium">Pergerakan tahap</h3>
            {page.data.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                    Belum ada perpindahan tahap.
                </p>
            ) : (
                <ol className="mt-3 space-y-3 border-l pl-4">
                    {page.data.map((event) => (
                        <li
                            key={event.key}
                            className="relative text-sm [overflow-wrap:anywhere]"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary"
                            />
                            <span className="block font-medium">
                                {event.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {event.actor_name ?? 'Sistem'} ·{' '}
                                {historyDate(event.occurred_at)}
                            </span>
                            {event.body && (
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                    {event.body}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
            {cutoff && (
                <p className="mt-2 text-xs text-muted-foreground">{cutoff}</p>
            )}
        </section>
    );
}
