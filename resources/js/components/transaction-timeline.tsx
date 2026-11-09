import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
    HistoryPage,
    TimelineComment,
    TimelineEvent,
} from '@/types/history';

export function historyDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(value))
        : 'Waktu belum tercatat';
}
export function HistoryPagination({
    page,
    label,
    onPageChange,
}: {
    page: HistoryPage<unknown>;
    label: string;
    onPageChange: (page: number) => void;
}) {
    if (page.last_page <= 1) return null;
    return (
        <nav
            aria-label={`Halaman ${label.toLowerCase()}`}
            className="mt-3 flex flex-wrap items-center gap-2 text-sm"
        >
            <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`${label} sebelumnya`}
                disabled={page.current_page <= 1}
                onClick={() => onPageChange(page.current_page - 1)}
            >
                Sebelumnya
            </Button>
            <span>
                Halaman {page.current_page} dari {page.last_page} · {page.total}{' '}
                kejadian
            </span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`${label} berikutnya`}
                disabled={page.current_page >= page.last_page}
                onClick={() => onPageChange(page.current_page + 1)}
            >
                Berikutnya
            </Button>
        </nav>
    );
}
export function TimelineEntry({
    event,
    onReply,
    onEdit,
    className,
}: {
    event: TimelineEvent;
    onReply?: (comment: TimelineComment) => void;
    onEdit?: (comment: TimelineComment) => void;
    className?: string;
}) {
    return (
        <li
            data-event-key={event.key}
            className={cn(
                'min-w-0 space-y-2 text-sm [overflow-wrap:anywhere]',
                className,
            )}
        >
            <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-medium">{event.label}</span>
                <span>{event.actor_name ?? 'Sistem'}</span>
                <time
                    dateTime={event.occurred_at}
                    className="text-xs text-muted-foreground"
                >
                    {historyDate(event.occurred_at)}
                </time>
            </div>
            {event.comment?.parent_id != null && (
                <blockquote className="border-l-2 pl-3 text-xs text-muted-foreground">
                    Membalas {event.comment.parent_author_name ?? 'Pengguna'}:{' '}
                    {event.comment.parent_body}
                </blockquote>
            )}
            {event.body && <p className="whitespace-pre-wrap">{event.body}</p>}
            {event.comment && (
                <>
                    <p className="text-xs text-muted-foreground">
                        {event.comment.stage_at_creation_label
                            ? `Saat dikirim: ${event.comment.stage_at_creation_label}`
                            : 'Tahap saat kirim belum tercatat'}
                        {event.comment.edited_at
                            ? ` · Diedit ${historyDate(event.comment.edited_at)}`
                            : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {onReply && event.comment.parent_id === null && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onReply(event.comment!)}
                            >
                                Balas
                            </Button>
                        )}
                        {onEdit && event.comment.can_edit && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(event.comment!)}
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                    {event.comment.revisions &&
                        event.comment.revisions.length > 0 && (
                            <details className="rounded-md border p-3">
                                <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
                                    Riwayat revisi (
                                    {event.comment.revisions.length})
                                </summary>
                                <ol className="space-y-3">
                                    {event.comment.revisions.map((revision) => (
                                        <li key={revision.id}>
                                            <p className="text-xs text-muted-foreground">
                                                {revision.editor_name ??
                                                    'Pengguna'}{' '}
                                                ·{' '}
                                                {historyDate(
                                                    revision.edited_at,
                                                )}
                                            </p>
                                            <p className="mt-1 whitespace-pre-wrap">
                                                {revision.old_body}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}
                </>
            )}
        </li>
    );
}
export function TransactionTimeline({
    page,
    onPageChange,
    onReply,
    onEdit,
}: {
    page: HistoryPage<TimelineEvent>;
    onPageChange: (page: number) => void;
    onReply?: (comment: TimelineComment) => void;
    onEdit?: (comment: TimelineComment) => void;
}) {
    return (
        <section aria-label="Timeline transaksi" className="min-w-0">
            <h4 className="text-sm font-semibold">Timeline transaksi</h4>
            {page.data.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                    Belum ada kejadian pada transaksi ini.
                </p>
            ) : (
                <ol className="mt-3 space-y-4 border-l pl-4">
                    {page.data.map((event) => (
                        <TimelineEntry
                            key={event.key}
                            event={event}
                            onReply={onReply}
                            onEdit={onEdit}
                        />
                    ))}
                </ol>
            )}
            <HistoryPagination
                page={page}
                label="Timeline"
                onPageChange={onPageChange}
            />
        </section>
    );
}
