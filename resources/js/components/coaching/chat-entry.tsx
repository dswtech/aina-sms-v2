import { historyDate } from '@/components/transaction-timeline';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { chatTime } from '@/lib/coaching';
import type { ChatRow } from '@/lib/coaching';
import { cn } from '@/lib/utils';
import type { TimelineComment } from '@/types/history';

const roleNames: Record<string, string> = {
    sales: 'Sales',
    supervisor: 'Supervisor',
    admin: 'Admin',
};

function TextAction({
    onClick,
    children,
}: {
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-sm font-medium underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        >
            {children}
        </button>
    );
}

/** One timeline event: comments as bubbles, stage moves and activities as a centred line. */
export function ChatEntry({
    row: { event, day, continues },
    onReply,
    onEdit,
}: {
    row: ChatRow;
    onReply?: (comment: TimelineComment) => void;
    onEdit?: (comment: TimelineComment) => void;
}) {
    const { comment } = event;
    const mine = comment?.is_mine === true;

    return (
        <li
            data-event-key={event.key}
            className={cn(
                'flex min-w-0 flex-col text-sm [overflow-wrap:anywhere]',
                continues ? 'mt-1' : 'mt-4 first:mt-0',
            )}
        >
            {day && (
                <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                    {day}
                </p>
            )}
            {!comment ? (
                <div className="flex items-center gap-3 text-center text-xs text-muted-foreground before:h-px before:min-w-4 before:flex-1 before:bg-border after:h-px after:min-w-4 after:flex-1 after:bg-border">
                    <div className="max-w-[75%]">
                        <p>
                            {event.label} · {event.actor_name ?? 'Sistem'} ·{' '}
                            <time dateTime={event.occurred_at}>
                                {chatTime(event.occurred_at)}
                            </time>
                        </p>
                        {event.body && (
                            <p className="whitespace-pre-wrap">{event.body}</p>
                        )}
                    </div>
                </div>
            ) : (
                <Bubble
                    variant={mine ? 'default' : 'muted'}
                    align={mine ? 'end' : 'start'}
                >
                    {/* Kept for screen readers, where side and grouping are not visible. */}
                    <p
                        className={cn(
                            'px-1 text-xs font-medium text-muted-foreground',
                            (mine || continues) && 'sr-only',
                        )}
                    >
                        {mine ? 'Anda' : (event.actor_name ?? 'Pengguna')}
                        {!mine && comment.author_role
                            ? ` · ${roleNames[comment.author_role] ?? comment.author_role}`
                            : ''}
                    </p>
                    <BubbleContent className="rounded-xl px-3 py-2 text-sm">
                        {comment.parent_id != null && (
                            <blockquote className="mb-1.5 line-clamp-3 border-l-2 border-current pl-2 text-xs">
                                <span className="font-medium">
                                    Membalas{' '}
                                    {comment.parent_author_name ?? 'Pengguna'}:
                                </span>{' '}
                                {comment.parent_body}
                            </blockquote>
                        )}
                        <p className="whitespace-pre-wrap">{event.body}</p>
                    </BubbleContent>
                    <div
                        className={cn(
                            'flex flex-wrap items-center gap-x-2 px-1 text-xs text-muted-foreground',
                            mine && 'justify-end',
                        )}
                    >
                        <time
                            dateTime={event.occurred_at}
                            title={historyDate(event.occurred_at)}
                        >
                            {chatTime(event.occurred_at)}
                        </time>
                        {comment.stage_at_creation_label ? (
                            <span>
                                <span className="sr-only">Saat dikirim: </span>
                                {comment.stage_at_creation_label}
                            </span>
                        ) : (
                            <span>Tahap saat kirim belum tercatat</span>
                        )}
                        {comment.edited_at && (
                            <span title={historyDate(comment.edited_at)}>
                                Diedit
                            </span>
                        )}
                        {onReply && comment.parent_id === null && (
                            <TextAction onClick={() => onReply(comment)}>
                                Balas
                            </TextAction>
                        )}
                        {onEdit && comment.can_edit && (
                            <TextAction onClick={() => onEdit(comment)}>
                                Edit
                            </TextAction>
                        )}
                    </div>
                    {comment.revisions && comment.revisions.length > 0 && (
                        <details className="rounded-md border px-3 text-xs">
                            <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
                                Riwayat revisi ({comment.revisions.length})
                            </summary>
                            <ol className="space-y-3 pb-3">
                                {comment.revisions.map((revision) => (
                                    <li key={revision.id}>
                                        <p className="text-muted-foreground">
                                            {revision.editor_name ?? 'Pengguna'}{' '}
                                            · {historyDate(revision.edited_at)}
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap">
                                            {revision.old_body}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </details>
                    )}
                </Bubble>
            )}
        </li>
    );
}
