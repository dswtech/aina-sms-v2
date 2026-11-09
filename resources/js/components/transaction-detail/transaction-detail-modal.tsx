import {
    Activity,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    MessageSquare,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, PointerEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { TimelineEntry } from '@/components/transaction-timeline';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    clampPanelWidth,
    composerKey,
    daysInStageLabel,
} from '@/lib/transaction-detail';
import { supervisorLabel } from '@/lib/transaction-labels';
import type { TimelineComment, TransactionDetailData } from '@/types/history';
import { CommentComposer } from './comment-composer';
import { DetailProperties } from './detail-properties';
import { StageTimeline } from './stage-timeline';
import { useTransactionFeed } from './use-transaction-feed';

type Target = {
    public_id: string;
    customer: { name: string } | null;
    vehicle_model: string | null;
};

type Props = {
    target: Target | null;
    onClose: () => void;
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    leasings: { id: number; name: string }[];
};

type Mode = 'comments' | 'activities';
type View = 'detail' | Mode;

const noVehicle = 'Kendaraan belum ditentukan';
const RAIL_WIDTH = 44;
const SEPARATOR_WIDTH = 6;
const DEFAULT_PANEL_WIDTH = 300;

function RailButton({
    label,
    icon: Icon,
    pressed,
    onClick,
}: {
    label: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    pressed?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            onClick={onClick}
            className="flex min-h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-foreground"
        >
            <Icon aria-hidden className="size-4" />
        </button>
    );
}

function DetailView({
    detail,
    regions,
    districts,
    leasings,
    onSaved,
}: Omit<Props, 'target' | 'onClose'> & {
    detail: TransactionDetailData;
    onSaved: () => void;
}) {
    const isMobile = useIsMobile();
    const bodyRef = useRef<HTMLDivElement>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<View>('detail');
    const [mode, setMode] = useState<Mode>('comments');
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);
    const [replyTo, setReplyTo] = useState<TimelineComment | null>(null);
    const [editing, setEditing] = useState<TimelineComment | null>(null);

    // On a phone the rail picks one column; on desktop it picks the right panel's mode.
    const activeMode: Mode = isMobile
        ? view === 'activities'
            ? 'activities'
            : 'comments'
        : mode;
    const showLeft = !isMobile || view === 'detail';
    const showRight = isMobile ? view !== 'detail' : !collapsed;

    const comments = useTransactionFeed(
        detail.public_id,
        'comments',
        detail.comments,
        true,
    );
    const activities = useTransactionFeed(
        detail.public_id,
        'activities',
        null,
        showRight && activeMode === 'activities',
    );
    const feed = activeMode === 'comments' ? comments : activities;
    const newestKey = feed.events.at(-1)?.key;

    useEffect(() => {
        // Newest sits at the bottom, next to the composer; prepending older pages keeps this key.
        const element = feedRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [activeMode, newestKey, showRight]);

    const resize = (event: PointerEvent<HTMLDivElement>) => {
        const body = bodyRef.current;
        if (!body || !event.currentTarget.hasPointerCapture(event.pointerId))
            return;
        const box = body.getBoundingClientRect();
        setWidth(
            clampPanelWidth(
                box.right - RAIL_WIDTH - event.clientX,
                box.width - RAIL_WIDTH - SEPARATOR_WIDTH,
            ),
        );
    };

    const pickMode = (next: Mode) => {
        if (isMobile) setView(next);
        else {
            setMode(next);
            setCollapsed(false);
        }
    };

    const canReply = detail.can_comment && activeMode === 'comments';
    const days = daysInStageLabel(detail.days_in_stage);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="space-y-1 border-b px-4 py-3 pr-14">
                <p className="text-lg leading-tight font-semibold">
                    {detail.customer.name} · {detail.vehicle_model ?? noVehicle}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <Badge variant="secondary">{detail.stage_label}</Badge>
                    <span>Sales: {detail.sales?.name ?? '-'}</span>
                    <span>Supervisor: {supervisorLabel(detail)}</span>
                    {days && <span className="text-amber-600">{days}</span>}
                </div>
            </div>
            <div ref={bodyRef} className="flex min-h-0 flex-1">
                {showLeft && (
                    <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
                        <DetailProperties
                            detail={detail}
                            regions={regions}
                            districts={districts}
                            leasings={leasings}
                            canEdit={detail.can_edit_metadata}
                            onSaved={onSaved}
                        />
                        <StageTimeline page={detail.stages} />
                    </div>
                )}
                {!isMobile && showRight && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Ubah lebar panel kanan"
                        aria-valuenow={width}
                        tabIndex={0}
                        onPointerDown={(event) =>
                            event.currentTarget.setPointerCapture(
                                event.pointerId,
                            )
                        }
                        onPointerMove={resize}
                        onKeyDown={(event) => {
                            const step =
                                event.key === 'ArrowLeft'
                                    ? 16
                                    : event.key === 'ArrowRight'
                                      ? -16
                                      : 0;
                            if (!step || !bodyRef.current) return;
                            event.preventDefault();
                            setWidth((current) =>
                                clampPanelWidth(
                                    current + step,
                                    bodyRef.current!.clientWidth -
                                        RAIL_WIDTH -
                                        SEPARATOR_WIDTH,
                                ),
                            );
                        }}
                        className="group flex w-1.5 shrink-0 cursor-col-resize justify-center outline-none"
                    >
                        <span className="h-full w-px bg-border group-hover:w-0.5 group-hover:bg-ring group-focus-visible:w-0.5 group-focus-visible:bg-ring" />
                    </div>
                )}
                {showRight && (
                    <div
                        className={`flex min-w-0 flex-col border-l ${isMobile ? 'flex-1' : 'shrink-0'}`}
                        style={isMobile ? undefined : { width }}
                    >
                        <h2 className="px-3 py-2 text-sm font-medium">
                            {activeMode === 'comments'
                                ? 'Komentar coaching'
                                : 'Aktivitas pelanggan'}
                        </h2>
                        <div
                            ref={feedRef}
                            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3"
                        >
                            {feed.hasEarlier && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={feed.state === 'loading'}
                                    onClick={feed.loadEarlier}
                                >
                                    Muat sebelumnya
                                </Button>
                            )}
                            {feed.state === 'error' && (
                                <p role="alert" className="text-sm">
                                    Belum dapat dimuat.{' '}
                                    <button
                                        type="button"
                                        className="underline"
                                        onClick={feed.retry}
                                    >
                                        Coba lagi
                                    </button>
                                </p>
                            )}
                            {feed.events.length === 0 &&
                                feed.state === 'idle' && (
                                    <p className="text-sm text-muted-foreground">
                                        {activeMode === 'comments'
                                            ? 'Belum ada komentar.'
                                            : 'Belum ada aktivitas.'}
                                    </p>
                                )}
                            <ol className="space-y-3">
                                {feed.events.map((event) => (
                                    <TimelineEntry
                                        key={event.key}
                                        event={event}
                                        className="rounded-lg bg-muted/40 p-2"
                                        onReply={
                                            canReply
                                                ? (comment) => {
                                                      setEditing(null);
                                                      setReplyTo(comment);
                                                  }
                                                : undefined
                                        }
                                        onEdit={
                                            canReply
                                                ? (comment) => {
                                                      setReplyTo(null);
                                                      setEditing(comment);
                                                  }
                                                : undefined
                                        }
                                    />
                                ))}
                            </ol>
                            {activeMode === 'activities' &&
                                feed.events.length > 0 && (
                                    <p className="text-center text-xs text-muted-foreground">
                                        Hanya baca
                                    </p>
                                )}
                        </div>
                        {activeMode === 'comments' && detail.can_comment && (
                            <CommentComposer
                                key={composerKey(editing, replyTo)}
                                publicId={detail.public_id}
                                replyTo={replyTo}
                                editing={editing}
                                onCancel={() => {
                                    setReplyTo(null);
                                    setEditing(null);
                                }}
                                onDone={() => {
                                    setReplyTo(null);
                                    setEditing(null);
                                    comments.reload();
                                }}
                            />
                        )}
                    </div>
                )}
                <div
                    className="flex shrink-0 flex-col items-center gap-1 border-l bg-muted/30 pt-2"
                    style={{ width: RAIL_WIDTH }}
                >
                    {isMobile ? (
                        <RailButton
                            label="Detail"
                            icon={FileText}
                            pressed={view === 'detail'}
                            onClick={() => setView('detail')}
                        />
                    ) : (
                        <RailButton
                            label={
                                collapsed
                                    ? 'Buka panel kanan'
                                    : 'Lipat panel kanan'
                            }
                            icon={collapsed ? ChevronsLeft : ChevronsRight}
                            onClick={() => setCollapsed(!collapsed)}
                        />
                    )}
                    <RailButton
                        label="Komentar"
                        icon={MessageSquare}
                        pressed={
                            isMobile
                                ? view === 'comments'
                                : !collapsed && mode === 'comments'
                        }
                        onClick={() => pickMode('comments')}
                    />
                    <RailButton
                        label="Aktivitas"
                        icon={Activity}
                        pressed={
                            isMobile
                                ? view === 'activities'
                                : !collapsed && mode === 'activities'
                        }
                        onClick={() => pickMode('activities')}
                    />
                </div>
            </div>
        </div>
    );
}

export function TransactionDetailModal({
    target,
    onClose,
    regions,
    districts,
    leasings,
}: Props) {
    const publicId = target?.public_id ?? null;
    const [detail, setDetail] = useState<TransactionDetailData | null>(null);
    const [failed, setFailed] = useState(false);
    const request = useRef(0);

    // A slow answer for an earlier transaction must not overwrite the one now shown.
    const load = useCallback(
        async (silent: boolean) => {
            if (!publicId) return;
            const current = ++request.current;
            if (!silent) {
                setDetail(null);
                setFailed(false);
            }
            try {
                const response = await fetch(`/transactions/${publicId}`, {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error('detail');
                const body: TransactionDetailData = await response.json();
                if (current === request.current) setDetail(body);
            } catch {
                if (current === request.current && !silent) setFailed(true);
            }
        },
        [publicId],
    );

    useEffect(() => {
        void load(false);
    }, [load]);

    const ready = detail !== null && detail.public_id === publicId;

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                aria-describedby={undefined}
                // Radix hears Escape on the document first; an open picker must close alone.
                onEscapeKeyDown={(event) => {
                    if (
                        document.querySelector(
                            '[data-slot="property-picker-panel"]',
                        )
                    )
                        event.preventDefault();
                }}
                className="h-[90dvh] max-h-[90dvh] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-5xl"
            >
                <DialogTitle className="sr-only">Detail transaksi</DialogTitle>
                <DialogDescription className="sr-only">
                    {target?.customer?.name} ·{' '}
                    {target?.vehicle_model ?? noVehicle}
                </DialogDescription>
                {ready ? (
                    <DetailView
                        key={detail.public_id}
                        detail={detail}
                        regions={regions}
                        districts={districts}
                        leasings={leasings}
                        onSaved={() => void load(true)}
                    />
                ) : (
                    <div className="space-y-2 p-4 pr-14">
                        <p className="text-lg font-semibold">
                            {target?.customer?.name} ·{' '}
                            {target?.vehicle_model ?? noVehicle}
                        </p>
                        {failed ? (
                            <p role="alert" className="text-sm">
                                Detail belum dapat dimuat.{' '}
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={() => void load(false)}
                                >
                                    Coba lagi
                                </button>
                            </p>
                        ) : (
                            <p role="status" className="text-sm">
                                Memuat detail…
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
