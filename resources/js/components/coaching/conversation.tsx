import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Check,
    ChevronRight,
    CreditCard,
    ExternalLink,
    Eye,
    RotateCcw,
    UserRound,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatEntry } from '@/components/coaching/chat-entry';
import { StageBadge } from '@/components/stage-badge';
import { ClosingMonthForm } from '@/components/team-performance';
import { CommentComposer } from '@/components/transaction-detail/comment-composer';
import { useTransactionFeed } from '@/components/transaction-detail/use-transaction-feed';
import { Button } from '@/components/ui/button';
import { formatMonth } from '@/lib/calendar';
import { chatRows } from '@/lib/coaching';
import { composerKey } from '@/lib/transaction-detail';
import { closingMonthStale, financingParts } from '@/lib/transaction-labels';
import type { RowDetail } from '@/lib/transaction-labels';
import type {
    HistoryPage,
    TimelineComment,
    TimelineEvent,
} from '@/types/history';

export type ConversationSummary = {
    public_id: string;
    customer_name: string | null;
    vehicle_model: string | null;
    sales_name: string | null;
    stage_label: string;
    financing: RowDetail['financing'];
};
export type OpenConversation = ConversationSummary & {
    expected_closing_month: string | null;
    closed: boolean;
    stage_closed: boolean;
    last_comment_id: number | null;
    can_update: boolean;
    can_comment: boolean;
    can_close: boolean;
};

export function Conversation({
    transaction,
    timeline,
    backHref,
}: {
    transaction: OpenConversation;
    timeline: HistoryPage<TimelineEvent>;
    backHref: string;
}) {
    const feed = useTransactionFeed(
        transaction.public_id,
        'all',
        timeline,
        true,
    );
    const [replyTo, setReplyTo] = useState<TimelineComment | null>(null);
    const [editing, setEditing] = useState<TimelineComment | null>(null);
    const [saving, setSaving] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const heightBefore = useRef<number | null>(null);
    const newestKey = feed.events.at(-1)?.key;

    // A newer comment reached the page props (sent here, refreshed, or a refused "Selesai").
    const shownComment = useRef(transaction.last_comment_id);
    const { reload } = feed;
    useEffect(() => {
        if (shownComment.current === transaction.last_comment_id) return;
        shownComment.current = transaction.last_comment_id;
        reload();
    }, [transaction.last_comment_id, reload]);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [newestKey, transaction.closed]);

    // Older messages are added above; keep the message being read in place.
    useLayoutEffect(() => {
        const list = listRef.current;
        if (list && heightBefore.current !== null) {
            list.scrollTop += list.scrollHeight - heightBefore.current;
            heightBefore.current = null;
        }
    }, [feed.events.length]);

    const { main, detail } = financingParts(transaction);
    const closing = transaction.expected_closing_month;
    // Beranda sends SPK without a usable estimate here to fill it in; stays put after saving.
    const [closingOpen] = useState(
        transaction.stage_label === 'SPK' && closingMonthStale(closing),
    );
    const closingLabel = `Closing: ${closing ? formatMonth(`${closing}-01`) : 'belum diisi'}`;

    const setClosed = (closed: boolean) =>
        router.patch(
            `/transactions/${transaction.public_id}/coaching`,
            { closed, last_comment_id: transaction.last_comment_id },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => {
                    setSaving(true);
                    setCloseError(null);
                },
                onError: (errors) =>
                    setCloseError(
                        errors.last_comment_id ??
                            'Status belum tersimpan. Coba lagi.',
                    ),
                onFinish: () => setSaving(false),
            },
        );

    return (
        <section
            aria-labelledby="conversation-title"
            className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
            <header className="border-b px-4 py-3">
                <Link
                    href={backHref}
                    className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-primary @2xl:hidden"
                >
                    <ArrowLeft aria-hidden className="size-4" />
                    Kembali ke Coaching
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1 basis-48">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2
                                id="conversation-title"
                                className="text-base font-semibold [overflow-wrap:anywhere]"
                            >
                                {transaction.customer_name ?? 'Pelanggan'}
                            </h2>
                            <StageBadge stage={transaction.stage_label}>
                                {transaction.stage_label}
                            </StageBadge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {transaction.vehicle_model ??
                                'Kendaraan belum ditentukan'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link
                                href={`/transactions?transaction=${transaction.public_id}&date_from=&date_to=`}
                            >
                                <ExternalLink aria-hidden className="size-4" />
                                Lihat transaksi
                            </Link>
                        </Button>
                        {transaction.can_close &&
                            transaction.last_comment_id !== null && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() =>
                                        setClosed(!transaction.closed)
                                    }
                                >
                                    {transaction.closed ? (
                                        <RotateCcw
                                            aria-hidden
                                            className="size-4"
                                        />
                                    ) : (
                                        <Check aria-hidden className="size-4" />
                                    )}
                                    {transaction.closed
                                        ? 'Buka lagi'
                                        : 'Tandai selesai'}
                                </Button>
                            )}
                    </div>
                </div>
                {closeError && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                        {closeError}
                    </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <UserRound aria-hidden className="size-4 shrink-0" />
                        <span className="sr-only">Sales: </span>
                        {transaction.sales_name ?? '-'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <CreditCard aria-hidden className="size-4 shrink-0" />
                        <span className="sr-only">Pembiayaan: </span>
                        {transaction.financing.type
                            ? [main, detail].filter(Boolean).join(' · ')
                            : 'Pembiayaan belum ditentukan'}
                    </span>
                    {transaction.can_update ? (
                        <details
                            open={closingOpen}
                            className="group/closing open:basis-full"
                        >
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
                                <CalendarDays
                                    aria-hidden
                                    className="size-4 shrink-0"
                                />
                                {closingLabel}
                                <ChevronRight
                                    aria-hidden
                                    className="size-3.5 transition-transform group-open/closing:rotate-90 motion-reduce:transition-none"
                                />
                            </summary>
                            <div className="mt-2 max-w-sm text-foreground">
                                <ClosingMonthForm
                                    transactionId={transaction.public_id}
                                    month={closing}
                                />
                            </div>
                        </details>
                    ) : (
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays
                                aria-hidden
                                className="size-4 shrink-0"
                            />
                            {closingLabel}
                        </span>
                    )}
                </div>
            </header>
            <div
                ref={listRef}
                role="region"
                aria-label="Pesan"
                aria-busy={feed.state === 'loading'}
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
                <div className="mx-auto w-full max-w-3xl">
                    {feed.hasEarlier && (
                        <div className="mb-4 flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={feed.state === 'loading'}
                                onClick={() => {
                                    heightBefore.current =
                                        listRef.current?.scrollHeight ?? null;
                                    feed.loadEarlier();
                                }}
                            >
                                Muat sebelumnya
                            </Button>
                        </div>
                    )}
                    {feed.state === 'error' && (
                        <p role="alert" className="mb-4 text-center text-sm">
                            Pesan belum dapat dimuat.{' '}
                            <button
                                type="button"
                                className="underline"
                                onClick={feed.retry}
                            >
                                Coba lagi
                            </button>
                        </p>
                    )}
                    {feed.events.length === 0 && feed.state === 'idle' && (
                        <p className="text-center text-sm text-muted-foreground">
                            Belum ada kejadian pada transaksi ini.
                        </p>
                    )}
                    <ol>
                        {chatRows(feed.events).map((row) => (
                            <ChatEntry
                                key={row.event.key}
                                row={row}
                                onReply={
                                    transaction.can_comment
                                        ? (comment) => {
                                              setEditing(null);
                                              setReplyTo(comment);
                                          }
                                        : undefined
                                }
                                onEdit={
                                    transaction.can_comment
                                        ? (comment) => {
                                              setReplyTo(null);
                                              setEditing(comment);
                                          }
                                        : undefined
                                }
                            />
                        ))}
                    </ol>
                </div>
            </div>
            {(transaction.closed || transaction.stage_closed) && (
                <p className="flex items-center gap-2 border-t bg-muted px-4 py-2 text-sm">
                    <Check aria-hidden className="size-4 shrink-0" />
                    {transaction.stage_closed
                        ? `Transaksi sudah ${transaction.stage_label}. Komentar ditutup.`
                        : `Percakapan selesai.${transaction.can_comment ? ' Komentar baru akan membukanya lagi.' : ''}`}
                </p>
            )}
            {transaction.can_comment ? (
                <>
                    {replyTo && (
                        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                            <span className="line-clamp-2 border-l-2 border-primary pl-2">
                                {replyTo.author_name}: {replyTo.body}
                            </span>
                        </p>
                    )}
                    <CommentComposer
                        key={composerKey(editing, replyTo)}
                        publicId={transaction.public_id}
                        replyTo={replyTo}
                        editing={editing}
                        onCancel={() => {
                            setReplyTo(null);
                            setEditing(null);
                        }}
                        onDone={() => {
                            // An edit keeps the newest comment id, so nothing else refreshes the feed.
                            if (editing) feed.reload();
                            setReplyTo(null);
                            setEditing(null);
                        }}
                    />
                </>
            ) : (
                !transaction.stage_closed && (
                    <p className="flex items-center gap-2 border-t bg-muted px-4 py-3 text-sm">
                        <Eye aria-hidden className="size-4 shrink-0" />
                        Mode baca untuk audit.
                    </p>
                )
            )}
        </section>
    );
}
