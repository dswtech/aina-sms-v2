import {
    Activity,
    ArrowRightLeft,
    Bell,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    History,
    MessageCircle,
    MessageSquare,
    Phone,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, PointerEvent } from 'react';
import { CustomerHistory } from '@/components/customer-history';
import type { VehicleOption } from '@/components/transaction-fields';
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
import { canContact } from '@/lib/customer-contact';
import {
    clampPanelWidth,
    composerKey,
    daysInStageLabel,
} from '@/lib/transaction-detail';
import { supervisorLabel } from '@/lib/transaction-labels';
import type { TimelineComment, TransactionDetailData } from '@/types/history';
import { CommentComposer } from './comment-composer';
import { ActivityForm, CustomerPanel, FollowUpPanel } from './customer-panels';
import { DetailProperties } from './detail-properties';
import { StageForm } from './stage-form';
import type { StageAction } from './stage-form';
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
    stages: { value: string; label: string }[];
    lostReasons: { value: string; label: string }[];
    vehicleOptions: VehicleOption[];
    assignableSales: { id: number; name: string }[];
    /** Opens straight into the stage form (Ubah tahap, Konfirmasi Delivery, Batalkan DO). */
    intent?: { action: StageAction } | null;
    /** Lets a page send focus back to the control that opened the modal. */
    onCloseAutoFocus?: (event: Event) => void;
};

type Mode =
    | 'comments'
    | 'activities'
    | 'followups'
    | 'customer'
    | 'history'
    | 'stage';

const modeTitles: Record<Mode, string> = {
    comments: 'Komentar coaching',
    activities: 'Aktivitas pelanggan',
    followups: 'Follow-up',
    customer: 'Pelanggan',
    history: 'Riwayat pelanggan',
    stage: 'Ubah tahap',
};
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
    stages,
    lostReasons,
    vehicleOptions,
    assignableSales,
    intent,
    onSaved,
    refreshFailed,
}: Omit<Props, 'target' | 'onClose'> & {
    detail: TransactionDetailData;
    onSaved: () => void;
    refreshFailed: boolean;
}) {
    const isMobile = useIsMobile();
    const bodyRef = useRef<HTMLDivElement>(null);
    const feedRef = useRef<HTMLDivElement>(null);
    const startsInStage = intent != null;
    const [view, setView] = useState<View>(startsInStage ? 'stage' : 'detail');
    const [mode, setMode] = useState<Mode>(
        startsInStage ? 'stage' : 'comments',
    );
    const [stageAction, setStageAction] = useState<StageAction>(
        intent?.action ?? null,
    );
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);
    const [bodyWidth, setBodyWidth] = useState(0);
    const [replyTo, setReplyTo] = useState<TimelineComment | null>(null);
    const [editing, setEditing] = useState<TimelineComment | null>(null);

    // On a phone the rail picks one column; on desktop it picks the right panel's mode.
    const activeMode: Mode = isMobile
        ? view === 'detail'
            ? 'comments'
            : view
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
    const isFeed = activeMode === 'comments' || activeMode === 'activities';
    const feed = activeMode === 'comments' ? comments : activities;
    const newestKey = feed.events.at(-1)?.key;

    useEffect(() => {
        // Newest sits at the bottom, next to the composer; prepending older pages keeps this key.
        const element = feedRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [activeMode, newestKey, showRight]);

    // A narrower window must not leave the right panel wider than the left panel allows.
    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;
        const observer = new ResizeObserver(([entry]) =>
            setBodyWidth(entry.contentRect.width),
        );
        observer.observe(body);

        return () => observer.disconnect();
    }, []);
    const panelWidth = bodyWidth
        ? clampPanelWidth(width, bodyWidth - RAIL_WIDTH - SEPARATOR_WIDTH)
        : width;

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
    const openStage = (action: StageAction) => {
        setStageAction(action);
        pickMode('stage');
    };
    const afterStage = () => {
        onSaved();
        setStageAction(null);
        pickMode('comments');
    };
    const canStage =
        detail.can_update ||
        detail.can_confirm_delivery ||
        detail.can_cancel_do;
    // Branch Managers get no timeline or history, and no customer writes.
    const hasCustomer = detail.customer.public_id !== null;
    const canHistory = hasCustomer && detail.stages !== null;
    const phone = detail.customer.phone;
    const waHref = `https://wa.me/${phone.replace(/[^\d]/g, '').replace(/^0/, '62')}`;
    const contactButton = (
        channel: 'phone' | 'whatsapp',
        label: string,
        href: string,
    ) => {
        const Icon = channel === 'phone' ? Phone : MessageCircle;

        return canContact(detail.customer, channel) ? (
            <Button
                asChild
                variant="outline"
                size="icon"
                className="size-9"
                title={label}
            >
                <a
                    href={href}
                    aria-label={`${label} ${detail.customer.name}`}
                    {...(channel === 'whatsapp'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                >
                    <Icon aria-hidden className="size-4" />
                </a>
            </Button>
        ) : (
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 opacity-50"
                aria-disabled="true"
                aria-label={`${label} tidak tersedia`}
                title={`${label} tidak tersedia: pelanggan menolak dihubungi lewat kanal ini`}
                onClick={(event) => event.preventDefault()}
            >
                <Icon aria-hidden className="size-4" />
            </Button>
        );
    };

    const canReply = detail.can_comment && activeMode === 'comments';
    const days = daysInStageLabel(detail.days_in_stage);

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
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
                {/* The header's right padding clears the close button; the buttons sit below it. */}
                <div className="-mr-10 flex flex-wrap items-center gap-2 pt-1">
                    {detail.can_update && (
                        <Button
                            type="button"
                            size="sm"
                            className="min-h-9"
                            onClick={() => openStage(null)}
                        >
                            Ubah tahap
                        </Button>
                    )}
                    {detail.can_confirm_delivery && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9"
                            onClick={() => openStage('delivery')}
                        >
                            Konfirmasi Delivery
                        </Button>
                    )}
                    {detail.can_cancel_do && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9 text-destructive"
                            onClick={() => openStage('cancel')}
                        >
                            Batalkan DO
                        </Button>
                    )}
                    {hasCustomer &&
                        phone &&
                        contactButton('phone', 'Telepon', `tel:${phone}`)}
                    {hasCustomer &&
                        phone &&
                        contactButton('whatsapp', 'WhatsApp', waHref)}
                </div>
            </div>
            {refreshFailed && (
                <p role="alert" className="border-b px-4 py-2 text-sm">
                    Tampilan belum diperbarui setelah perubahan terakhir.{' '}
                    <button
                        type="button"
                        className="underline"
                        onClick={onSaved}
                    >
                        Coba lagi
                    </button>
                </p>
            )}
            <div ref={bodyRef} className="flex min-h-0 flex-1">
                {showLeft && (
                    <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
                        <DetailProperties
                            detail={detail}
                            regions={regions}
                            districts={districts}
                            leasings={leasings}
                            vehicleOptions={vehicleOptions}
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
                        aria-valuenow={panelWidth}
                        aria-valuemin={160}
                        aria-valuemax={Math.max(
                            160,
                            bodyWidth - RAIL_WIDTH - SEPARATOR_WIDTH - 300,
                        )}
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
                                    Math.min(current, panelWidth) + step,
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
                        style={isMobile ? undefined : { width: panelWidth }}
                    >
                        <h2
                            id="detail-feed-title"
                            className="px-3 py-2 text-sm font-medium"
                        >
                            {modeTitles[activeMode]}
                        </h2>
                        {activeMode === 'stage' && (
                            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                                <StageForm
                                    key={`${detail.public_id}-${stageAction}`}
                                    detail={detail}
                                    action={stageAction}
                                    stages={stages}
                                    lostReasons={lostReasons}
                                    vehicleOptions={vehicleOptions}
                                    regions={regions}
                                    districts={districts}
                                    onDone={afterStage}
                                    onCancel={() => pickMode('comments')}
                                />
                            </div>
                        )}
                        {activeMode === 'customer' && (
                            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                                <CustomerPanel
                                    detail={detail}
                                    assignableSales={assignableSales}
                                    onSaved={onSaved}
                                />
                            </div>
                        )}
                        {activeMode === 'followups' && (
                            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                                <FollowUpPanel
                                    detail={detail}
                                    onSaved={onSaved}
                                />
                            </div>
                        )}
                        {activeMode === 'history' &&
                            detail.customer.public_id && (
                                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                                    <CustomerHistory
                                        customerId={detail.customer.public_id}
                                        refreshKey={detail.progress_at}
                                        onSelection={() => undefined}
                                        onReply={() => undefined}
                                        onEdit={() => undefined}
                                    />
                                </div>
                            )}
                        {isFeed && (
                            <div
                                ref={feedRef}
                                role="region"
                                aria-labelledby="detail-feed-title"
                                aria-busy={feed.state === 'loading'}
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
                                {feed.state === 'loading' && (
                                    <p
                                        role="status"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Memuat…
                                    </p>
                                )}
                                {feed.events.length === 0 &&
                                    feed.fetched &&
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
                            </div>
                        )}
                        {activeMode === 'activities' &&
                            detail.can_edit_customer &&
                            hasCustomer && (
                                <ActivityForm
                                    detail={detail}
                                    onSaved={() => {
                                        onSaved();
                                        activities.reload();
                                    }}
                                />
                            )}
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
                    role="group"
                    aria-label="Mode panel kanan"
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
                    {hasCustomer && (
                        <RailButton
                            label="Follow-up"
                            icon={Bell}
                            pressed={
                                isMobile
                                    ? view === 'followups'
                                    : !collapsed && mode === 'followups'
                            }
                            onClick={() => pickMode('followups')}
                        />
                    )}
                    {hasCustomer && (
                        <RailButton
                            label="Pelanggan"
                            icon={User}
                            pressed={
                                isMobile
                                    ? view === 'customer'
                                    : !collapsed && mode === 'customer'
                            }
                            onClick={() => pickMode('customer')}
                        />
                    )}
                    {canHistory && (
                        <RailButton
                            label="Riwayat"
                            icon={History}
                            pressed={
                                isMobile
                                    ? view === 'history'
                                    : !collapsed && mode === 'history'
                            }
                            onClick={() => pickMode('history')}
                        />
                    )}
                    {canStage && (
                        <RailButton
                            label="Ubah tahap"
                            icon={ArrowRightLeft}
                            pressed={
                                isMobile
                                    ? view === 'stage'
                                    : !collapsed && mode === 'stage'
                            }
                            onClick={() => openStage(null)}
                        />
                    )}
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
    stages,
    lostReasons,
    vehicleOptions,
    assignableSales,
    intent,
    onCloseAutoFocus,
}: Props) {
    const publicId = target?.public_id ?? null;
    // Keep showing the last transaction while the dialog animates closed.
    const [lastTarget, setLastTarget] = useState(target);
    if (target && target !== lastTarget) setLastTarget(target);
    const shown = target ?? lastTarget;
    const [refreshFailed, setRefreshFailed] = useState(false);
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
            setRefreshFailed(false);
            try {
                const response = await fetch(`/transactions/${publicId}`, {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error('detail');
                const body: TransactionDetailData = await response.json();
                if (current === request.current) setDetail(body);
            } catch {
                if (current === request.current) {
                    if (silent) setRefreshFailed(true);
                    else setFailed(true);
                }
            }
        },
        [publicId],
    );

    useEffect(() => {
        void load(false);
    }, [load]);

    const ready = detail !== null && detail.public_id === shown?.public_id;

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                aria-describedby={undefined}
                onCloseAutoFocus={onCloseAutoFocus}
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
                    {shown?.customer?.name} ·{' '}
                    {shown?.vehicle_model ?? noVehicle}
                </DialogDescription>
                {ready ? (
                    <DetailView
                        key={detail.public_id}
                        detail={detail}
                        regions={regions}
                        districts={districts}
                        leasings={leasings}
                        stages={stages}
                        lostReasons={lostReasons}
                        vehicleOptions={vehicleOptions}
                        assignableSales={assignableSales}
                        intent={intent}
                        onSaved={() => void load(true)}
                        refreshFailed={refreshFailed}
                    />
                ) : (
                    <div className="space-y-2 p-4 pr-14">
                        <p className="text-lg font-semibold">
                            {shown?.customer?.name} ·{' '}
                            {shown?.vehicle_model ?? noVehicle}
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
