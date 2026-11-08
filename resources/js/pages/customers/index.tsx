import { CustomerHistory } from '@/components/customer-history';
import { DoChecklist, emptyDoChecklist } from '@/components/do-checklist';
import type { HistoryTransaction, TimelineComment } from '@/types/history';
import { ClosingMonthForm } from '@/components/team-performance';
import { CustomerContactPreferences } from '@/components/customer-contact-preferences';
import { canContact } from '@/lib/customer-contact';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { FilterPanel } from '@/components/filter-panel';
import {
    ArrowUpDown,
    Calendar,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    MessageSquare,
    Phone,
    Plus,
    Search,
    Users,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type CustomerItem = {
    public_id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    contact_channel_preference: string | null;
    opt_out: boolean;
    last_contact_at: string | null;
    notes: string | null;
    assigned_sales: {
        public_id: string;
        name: string;
        username: string;
    } | null;
    active_deal: {
        id: number;
        public_id: string;
        vehicle_model: string;
        current_stage: string;
        stage_label: string;
        is_closed: boolean;
        can_record_do: boolean;
        stage_event_id: number | null;
        is_stagnant: boolean;
        estimated_value: number | null;
        expected_closing_month: string | null;
        can_comment: boolean;
    } | null;
    next_follow_up: {
        id: number;
        scheduled_at: string;
        plan_notes: string;
        status: string;
    } | null;
};

type Props = {
    customers: {
        data: CustomerItem[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search: string;
        tab: string;
        sort: string;
        direction: string;
    };
    counts: {
        all: number;
        follow_up_today: number;
        uncontacted: number;
        active: number;
        purchased: number;
        inactive: number;
        repeat_order: number;
        referral: number;
    };
    assignableSales?: Array<{
        id: number;
        public_id: string;
        name: string;
    }>;
};

function formatPhoneLink(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '');
    return `https://wa.me/${digits}`;
}

function formatDate(iso: string | null): string {
    if (!iso) return 'Belum ada kontak';
    const date = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(date);
}

export default function CustomersIndex({
    customers,
    filters,
    counts,
    assignableSales = [],
}: Props) {
    const { auth, errors } = usePage().props;
    const role = auth.user.role;
    const [search, setSearch] = useState(filters.search || '');
    const [activityOpen, setActivityOpen] = useState(false);
    const [followUpOpen, setFollowUpOpen] = useState(false);
    const [stageOpen, setStageOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const customerActionTriggerRef = useRef<HTMLButtonElement | null>(null);
    const detailTitleRef = useRef<HTMLHeadingElement | null>(null);
    const [reassignOpen, setReassignOpen] = useState(false);
    const [selectedCustomerSnapshot, setSelectedCustomer] =
        useState<CustomerItem | null>(null);
    const [historyDeal, setHistoryDeal] = useState<HistoryTransaction | null>(
        null,
    );
    const [historyReady, setHistoryReady] = useState(false);
    const [historyMode, setHistoryMode] = useState(false);
    const currentCustomer =
        customers.data.find(
            (customer) =>
                customer.public_id === selectedCustomerSnapshot?.public_id,
        ) ?? null;

    const selectedCustomer =
        currentCustomer && (!historyMode || historyReady)
            ? {
                  ...currentCustomer,
                  active_deal: historyMode
                      ? historyDeal
                      : currentCustomer.active_deal,
              }
            : null;

    // Form states

    const [actType, setActType] = useState('call');
    const [actNotes, setActNotes] = useState('');
    const [activitySaving, setActivitySaving] = useState(false);
    const [activityError, setActivityError] = useState('');

    const [fuDate, setFuDate] = useState('');
    const [fuNotes, setFuNotes] = useState('');
    const [followUpSaving, setFollowUpSaving] = useState(false);
    const [followUpError, setFollowUpError] = useState('');

    const [nextStage, setNextStage] = useState('prospect');
    const [stageNotes, setStageNotes] = useState('');
    const stageEventId = useRef<number | null>(null);
    const [lostReason, setLostReason] = useState('price_budget');
    const [bookingFee, setBookingFee] = useState(false);
    const [doChecklist, setDoChecklist] = useState(emptyDoChecklist);

    const [reassignSalesId, setReassignSalesId] = useState('');
    const [reassignNotes, setReassignNotes] = useState('');

    // Comment states
    const [commentBody, setCommentBody] = useState('');
    const [replyParentId, setReplyParentId] = useState<number | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<number | null>(
        null,
    );
    const [editBody, setEditBody] = useState('');

    const historyTransactionRef = useRef<string | null>(null);
    const selectHistoryTransaction = useCallback(
        (
            transaction: HistoryTransaction | null,
            ready: boolean,
            invalidate = false,
        ) => {
            setHistoryDeal(transaction);
            setHistoryReady(ready);
            const identity = transaction?.public_id ?? null;
            const changed = ready && identity !== historyTransactionRef.current;
            if (ready || invalidate) historyTransactionRef.current = identity;
            if (!changed && !invalidate) return;
            setCommentBody('');
            setReplyParentId(null);
            setReplyBody('');
            setEditingCommentId(null);
            setEditBody('');
            setStageOpen(false);
            setStageNotes('');
            setBookingFee(false);
            setActivityOpen(false);
            setActNotes('');
            setFollowUpOpen(false);
            setFuDate('');
            setFuNotes('');
        },
        [],
    );
    function replyToHistory(comment: TimelineComment) {
        setEditingCommentId(null);
        setReplyParentId(comment.id);
        setReplyBody('');
        window.setTimeout(
            () => document.getElementById('history-comment-body')?.focus(),
            0,
        );
    }
    function editHistoryComment(comment: TimelineComment) {
        setReplyParentId(null);
        setEditingCommentId(comment.id);
        setEditBody(comment.body);
        window.setTimeout(
            () => document.getElementById('history-comment-body')?.focus(),
            0,
        );
    }

    function applyFilters(
        nextTab = filters.tab,
        query = search,
        nextSort = filters.sort,
        nextDirection = filters.direction,
    ) {
        router.get(
            '/customers',
            {
                tab: nextTab !== 'all' ? nextTab : undefined,
                search: query ? query : undefined,
                sort: nextSort !== 'updated_at' ? nextSort : undefined,
                direction:
                    nextSort !== 'updated_at' ? nextDirection : undefined,
            },
            { preserveState: true, replace: true },
        );
    }

    function toggleSort(column: 'name' | 'last_contact_at') {
        const nextDirection =
            filters.sort === column && filters.direction === 'asc'
                ? 'desc'
                : 'asc';

        applyFilters(filters.tab, search, column, nextDirection);
    }

    function restoreCustomerActionFocus(event: Event) {
        event.preventDefault();
        customerActionTriggerRef.current?.focus({ preventScroll: true });
    }

    function selectQuickCustomer(customer: CustomerItem) {
        setActivityError('');
        setFollowUpError('');
        setHistoryMode(false);
        setHistoryDeal(null);
        setHistoryReady(false);
        setSelectedCustomer(customer);
        setActNotes('');
        setFuDate('');
        setFuNotes('');
        setStageNotes('');
        setBookingFee(false);
    }
    function openDetail(customer: CustomerItem, trigger: HTMLButtonElement) {
        customerActionTriggerRef.current = trigger;
        setSelectedCustomer(customer);
        setHistoryMode(true);
        setHistoryDeal(null);
        setHistoryReady(false);
        setDetailOpen(true);
    }

    function handleLogActivity(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer || activitySaving) return;
        setActivitySaving(true);
        setActivityError('');
        router.post(
            `/customers/${selectedCustomer.public_id}/activities`,
            {
                type: actType,
                notes: actNotes,
                deal_transaction_id: selectedCustomer.active_deal?.id,
            },
            {
                onSuccess: () => {
                    setActivityOpen(false);
                    setActNotes('');
                },
                onFinish: () => setActivitySaving(false),
                onNetworkError: () => {
                    setActivityError(
                        'Koneksi terputus. Penyimpanan aktivitas belum dapat dipastikan. Isian tetap tersedia. Periksa riwayat pelanggan sebelum mencoba lagi.',
                    );
                    return false;
                },
                onHttpException: (response) => {
                    if (response.status < 500) return;
                    setActivityError(
                        'Penyimpanan aktivitas belum dapat dipastikan. Isian tetap tersedia. Periksa riwayat pelanggan sebelum mencoba lagi.',
                    );
                    return false;
                },
            },
        );
    }

    function handleScheduleFollowUp(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer || followUpSaving) return;
        setFollowUpSaving(true);
        setFollowUpError('');
        router.post(
            `/customers/${selectedCustomer.public_id}/follow-ups`,
            {
                scheduled_at: fuDate,
                plan_notes: fuNotes,
                deal_transaction_id: selectedCustomer.active_deal?.id,
            },
            {
                onSuccess: () => {
                    setFollowUpOpen(false);
                    setFuNotes('');
                    setFuDate('');
                },
                onFinish: () => setFollowUpSaving(false),
                onNetworkError: () => {
                    setFollowUpError(
                        'Koneksi terputus. Penyimpanan jadwal belum dapat dipastikan. Isian tetap tersedia. Periksa jadwal pelanggan sebelum mencoba lagi.',
                    );
                    return false;
                },
                onHttpException: (response) => {
                    if (response.status < 500) return;
                    setFollowUpError(
                        'Penyimpanan jadwal belum dapat dipastikan. Isian tetap tersedia. Periksa jadwal pelanggan sebelum mencoba lagi.',
                    );
                    return false;
                },
            },
        );
    }

    function openStage(stage: string) {
        stageEventId.current =
            selectedCustomer?.active_deal?.stage_event_id ?? null;
        setNextStage(stage);
        setDoChecklist(emptyDoChecklist);
        setStageOpen(true);
    }

    function handleUpdateStage(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer || !selectedCustomer.active_deal) return;
        router.patch(
            `/transactions/${selectedCustomer.active_deal.public_id}/stage`,
            {
                to_stage: nextStage,
                stage_event_id: stageEventId.current,
                notes: stageNotes,
                booking_fee_confirmed: bookingFee,
                ...doChecklist,
                lost_reason: nextStage === 'lost' ? lostReason : undefined,
                lost_notes: nextStage === 'lost' ? stageNotes : undefined,
            },
            {
                onSuccess: () => {
                    setStageOpen(false);
                    setStageNotes('');
                },
            },
        );
    }

    function handleReassign(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer) return;
        router.patch(
            `/customers/${selectedCustomer.public_id}/assignment`,
            {
                sales_id: Number(reassignSalesId),
                notes: reassignNotes || undefined,
            },
            {
                onSuccess: () => {
                    setReassignOpen(false);
                    setReassignSalesId('');
                    setReassignNotes('');
                },
            },
        );
    }

    function handleCreateComment(e: React.FormEvent, parentId?: number) {
        e.preventDefault();
        if (!selectedCustomer?.active_deal) return;
        const body = parentId ? replyBody : commentBody;
        router.post(
            `/transactions/${selectedCustomer.active_deal.public_id}/comments`,
            {
                body,
                parent_id: parentId ?? undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (parentId) {
                        setReplyBody('');
                        setReplyParentId(null);
                    } else {
                        setCommentBody('');
                    }
                },
            },
        );
    }

    function handleUpdateComment(e: React.FormEvent, commentId: number) {
        e.preventDefault();
        router.patch(
            `/comments/${commentId}`,
            { body: editBody },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingCommentId(null);
                    setEditBody('');
                },
            },
        );
    }

    return (
        <>
            <Head title="Buku Pelanggan Saya" />

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-4 pt-6 pb-24 sm:px-6 sm:pt-8 md:pb-10 lg:px-8">
                {/* Header Section */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Users className="size-4" aria-hidden="true" />
                            <span>Buku Pelanggan Saya</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                            Phonebook Kerja Sales
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Riwayat hubungan, status pipeline, dan tindak lanjut
                            harian pelanggan Anda.
                        </p>
                    </div>

                    <Button asChild className="min-h-11 w-full gap-2 sm:w-auto">
                        <Link href="/transactions/create">
                            <Plus className="size-4" />
                            <span>Tambah Lead Baru</span>
                        </Link>
                    </Button>
                </header>

                {/* Filter Tabs & Search */}
                <FilterPanel
                    className="mt-6"
                    title="Filter pelanggan"
                    collapseOnMobile
                    summary={`${[filters.search, filters.tab !== 'all' ? filters.tab : null].filter(Boolean).length} filter aktif`}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2 border-b pb-3">
                            <Button
                                variant={
                                    filters.tab === 'all'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('all')}
                                className="min-h-10 gap-1.5"
                            >
                                <span>Semua</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.all}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'follow_up_today'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('follow_up_today')}
                                className="min-h-10 gap-1.5"
                            >
                                <Calendar className="size-3.5" />
                                <span>Follow-up Hari Ini</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.follow_up_today}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'uncontacted'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('uncontacted')}
                                className="min-h-10 gap-1.5"
                            >
                                <Clock className="size-3.5" />
                                <span>Belum Dihubungi</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.uncontacted}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'active'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('active')}
                                className="min-h-10 gap-1.5"
                            >
                                <span>Peluang Aktif</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.active}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'purchased'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('purchased')}
                                className="min-h-10 gap-1.5"
                            >
                                <CheckCircle2 className="size-3.5" />
                                <span>Pernah Beli</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.purchased}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'inactive'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('inactive')}
                                className="min-h-10 gap-1.5"
                            >
                                <span>Tidak Aktif</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.inactive}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'repeat_order'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('repeat_order')}
                                className="min-h-10 gap-1.5"
                            >
                                <span>Potensi Repeat Order</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.repeat_order}
                                </Badge>
                            </Button>
                            <Button
                                variant={
                                    filters.tab === 'referral'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                onClick={() => applyFilters('referral')}
                                className="min-h-10 gap-1.5"
                            >
                                <span>Potensi Referral</span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 px-1.5 py-0 text-xs"
                                >
                                    {counts.referral}
                                </Badge>
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    aria-label="Pencarian pelanggan"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        applyFilters(filters.tab, search)
                                    }
                                    placeholder="Cari nama atau nomor telepon..."
                                    className="min-h-11 pl-9"
                                />
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    applyFilters(filters.tab, search)
                                }
                                className="min-h-11 px-4"
                            >
                                Cari
                            </Button>
                        </div>
                    </div>
                </FilterPanel>

                {/* Customer List Content — mobile & tablet cards */}
                <div className="mt-6 space-y-4 lg:hidden">
                    {customers.data.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-10 text-center">
                            <Users className="mx-auto size-10 text-muted-foreground/50" />
                            <h3 className="mt-3 text-base font-semibold">
                                Belum ada pelanggan ditemukan
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Coba ubah kata kunci pencarian atau pilih tab
                                filter yang lain.
                            </p>
                        </div>
                    ) : (
                        customers.data.map((c) => (
                            <Card
                                key={c.public_id}
                                className="striped-row overflow-hidden shadow-sm transition hover:bg-accent hover:shadow-md"
                            >
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        {/* Contact & Main Info */}
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                                                    {c.name}
                                                </h3>
                                                {c.active_deal && (
                                                    <StageBadge
                                                        stage={
                                                            c.active_deal
                                                                .current_stage
                                                        }
                                                        className="font-medium"
                                                    >
                                                        {
                                                            c.active_deal
                                                                .stage_label
                                                        }
                                                    </StageBadge>
                                                )}
                                                {c.active_deal?.is_stagnant && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="animate-pulse text-xs"
                                                    >
                                                        Stagnan &gt;3 Hari
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                {c.phone}{' '}
                                                {c.email ? `• ${c.email}` : ''}
                                            </p>

                                            {c.active_deal && (
                                                <p className="text-sm font-medium text-primary">
                                                    Minat:{' '}
                                                    {
                                                        c.active_deal
                                                            .vehicle_model
                                                    }
                                                </p>
                                            )}

                                            {c.next_follow_up && (
                                                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                                                    <CalendarClock className="size-3.5" />
                                                    <span>
                                                        Rencana tindak lanjut:{' '}
                                                        {
                                                            c.next_follow_up
                                                                .plan_notes
                                                        }{' '}
                                                        (
                                                        {formatDate(
                                                            c.next_follow_up
                                                                .scheduled_at,
                                                        )}
                                                        )
                                                    </span>
                                                </div>
                                            )}

                                            <div className="text-xs text-muted-foreground">
                                                Kontak terakhir:{' '}
                                                {formatDate(c.last_contact_at)}
                                            </div>
                                        </div>

                                        {/* Quick Action Touch Targets (>= 44px) */}
                                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                                            {canContact(c, 'phone') && (
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-h-11 min-w-11 gap-1.5 px-3"
                                                >
                                                    <a
                                                        href={`tel:${c.phone}`}
                                                        aria-label={`Telepon ${c.name}`}
                                                    >
                                                        <Phone className="size-4 text-emerald-600" />
                                                        <span className="xs:inline hidden">
                                                            Telepon
                                                        </span>
                                                    </a>
                                                </Button>
                                            )}

                                            {canContact(c, 'whatsapp') && (
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-h-11 min-w-11 gap-1.5 px-3"
                                                >
                                                    <a
                                                        aria-label={`WhatsApp ${c.name}`}
                                                        href={formatPhoneLink(
                                                            c.phone,
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <MessageSquare className="size-4 text-emerald-500" />
                                                        <span className="xs:inline hidden">
                                                            WhatsApp
                                                        </span>
                                                    </a>
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={(event) => {
                                                    customerActionTriggerRef.current =
                                                        event.currentTarget;
                                                    selectQuickCustomer(c);
                                                    setActivityOpen(true);
                                                }}
                                            >
                                                Catat Aktivitas
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={(event) => {
                                                    customerActionTriggerRef.current =
                                                        event.currentTarget;
                                                    selectQuickCustomer(c);
                                                    setFollowUpOpen(true);
                                                }}
                                            >
                                                Follow-Up
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={(event) =>
                                                    openDetail(
                                                        c,
                                                        event.currentTarget,
                                                    )
                                                }
                                            >
                                                Detail
                                            </Button>

                                            {c.active_deal &&
                                                !c.active_deal.is_closed && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="min-h-11 px-3"
                                                        onClick={(event) => {
                                                            customerActionTriggerRef.current =
                                                                event.currentTarget;
                                                            selectQuickCustomer(
                                                                c,
                                                            );
                                                            openStage(
                                                                c.active_deal!
                                                                    .current_stage,
                                                            );
                                                        }}
                                                    >
                                                        Ubah Tahap
                                                    </Button>
                                                )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Desktop table */}
                <div className="mt-6 hidden lg:block">
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleSort('name')}
                                            className="flex items-center gap-1 uppercase"
                                        >
                                            Pelanggan
                                            {filters.sort === 'name' ? (
                                                filters.direction === 'asc' ? (
                                                    <ChevronUp className="size-3" />
                                                ) : (
                                                    <ChevronDown className="size-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="size-3 opacity-50" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3">PIC</th>
                                    <th className="px-4 py-3">Tahap</th>
                                    <th className="px-4 py-3">Unit diminati</th>
                                    <th className="px-4 py-3">Tindak lanjut</th>
                                    <th className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleSort('last_contact_at')
                                            }
                                            className="flex items-center gap-1 uppercase"
                                        >
                                            Kontak terakhir
                                            {filters.sort ===
                                            'last_contact_at' ? (
                                                filters.direction === 'asc' ? (
                                                    <ChevronUp className="size-3" />
                                                ) : (
                                                    <ChevronDown className="size-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="size-3 opacity-50" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {customers.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-muted-foreground"
                                        >
                                            Belum ada pelanggan ditemukan.
                                        </td>
                                    </tr>
                                )}
                                {customers.data.map((c) => (
                                    <tr
                                        key={c.public_id}
                                        className="striped-row align-top hover:bg-accent"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-semibold">
                                                {c.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {c.phone}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {c.assigned_sales?.name ??
                                                'Belum ditugaskan'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {c.active_deal ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <StageBadge
                                                        stage={
                                                            c.active_deal
                                                                .current_stage
                                                        }
                                                    >
                                                        {
                                                            c.active_deal
                                                                .stage_label
                                                        }
                                                    </StageBadge>
                                                    {c.active_deal
                                                        .is_stagnant && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[10px]"
                                                        >
                                                            Stagnan &gt;3 Hari
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {c.active_deal?.vehicle_model ??
                                                '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {c.next_follow_up ? (
                                                <div className="text-xs">
                                                    <div className="font-medium">
                                                        {formatDate(
                                                            c.next_follow_up
                                                                .scheduled_at,
                                                        )}
                                                    </div>
                                                    <div
                                                        className="max-w-56 truncate text-muted-foreground"
                                                        title={
                                                            c.next_follow_up
                                                                .plan_notes
                                                        }
                                                    >
                                                        {
                                                            c.next_follow_up
                                                                .plan_notes
                                                        }
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    Belum dijadwalkan
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {formatDate(c.last_contact_at)}
                                        </td>
                                        <td className="table-actions px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                {canContact(c, 'phone') && (
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-10"
                                                    >
                                                        <a
                                                            href={`tel:${c.phone}`}
                                                            aria-label={`Telepon ${c.name}`}
                                                        >
                                                            <Phone className="size-4 text-emerald-600" />
                                                        </a>
                                                    </Button>
                                                )}
                                                {canContact(c, 'whatsapp') && (
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-10"
                                                    >
                                                        <a
                                                            href={formatPhoneLink(
                                                                c.phone,
                                                            )}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`WhatsApp ${c.name}`}
                                                        >
                                                            <MessageSquare className="size-4 text-emerald-500" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-h-10"
                                                    onClick={(event) =>
                                                        openDetail(
                                                            c,
                                                            event.currentTarget,
                                                        )
                                                    }
                                                >
                                                    Detail
                                                </Button>
                                                {c.active_deal &&
                                                    !c.active_deal
                                                        .is_closed && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="min-h-10"
                                                            onClick={(
                                                                event,
                                                            ) => {
                                                                customerActionTriggerRef.current =
                                                                    event.currentTarget;
                                                                selectQuickCustomer(
                                                                    c,
                                                                );
                                                                openStage(
                                                                    c
                                                                        .active_deal!
                                                                        .current_stage,
                                                                );
                                                            }}
                                                        >
                                                            Ubah Tahap
                                                        </Button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {customers.total > 0 && (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            Menampilkan {customers.from ?? 0}–
                            {customers.to ?? 0} dari {customers.total} pelanggan
                        </p>
                        {customers.last_page > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {customers.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        className="min-h-9"
                                        onClick={() =>
                                            link.url &&
                                            router.visit(link.url, {
                                                preserveState: true,
                                            })
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Dialog: Catat Aktivitas */}
                <Dialog
                    open={activityOpen}
                    onOpenChange={(open) => {
                        if (activitySaving) return;
                        setActivityOpen(open);
                        setActivityError('');
                    }}
                >
                    <DialogContent
                        className="sm:max-w-md"
                        onCloseAutoFocus={restoreCustomerActionFocus}
                    >
                        <DialogHeader>
                            <DialogTitle>Catat Aktivitas Lapangan</DialogTitle>
                            <DialogDescription>
                                Hubungi {selectedCustomer?.name} dan catat
                                perkembangannya.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleLogActivity}
                            className="space-y-4 pt-2"
                        >
                            {activityError && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {activityError}
                                </p>
                            )}
                            {activitySaving && (
                                <p
                                    role="status"
                                    className="text-sm text-muted-foreground"
                                >
                                    Menyimpan aktivitas…
                                </p>
                            )}
                            <fieldset
                                disabled={activitySaving}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <Label htmlFor="act-type">
                                        Kanal Aktivitas
                                    </Label>
                                    <Select
                                        value={actType}
                                        onValueChange={setActType}
                                    >
                                        <SelectTrigger
                                            id="act-type"
                                            className="min-h-11 w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="call">
                                                Telepon Langsung
                                            </SelectItem>
                                            <SelectItem value="whatsapp">
                                                Chat WhatsApp
                                            </SelectItem>
                                            <SelectItem value="visit">
                                                Kunjungan Rumah / Kantor
                                            </SelectItem>
                                            <SelectItem value="meeting">
                                                Pertemuan Showroom
                                            </SelectItem>
                                            <SelectItem value="note">
                                                Catatan Tambahan
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="act-notes">
                                        Hasil Komunikasi *
                                    </Label>
                                    <Input
                                        id="act-notes"
                                        required
                                        value={actNotes}
                                        onChange={(e) =>
                                            setActNotes(e.target.value)
                                        }
                                        placeholder="Pelanggan menanyakan simulasi kredit 5 tahun..."
                                        className="min-h-11"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    aria-busy={activitySaving}
                                    className="min-h-11 w-full"
                                >
                                    Simpan Aktivitas
                                </Button>
                            </fieldset>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Jadwalkan Next Follow-Up */}
                <Dialog
                    open={followUpOpen}
                    onOpenChange={(open) => {
                        if (followUpSaving) return;
                        setFollowUpOpen(open);
                        setFollowUpError('');
                    }}
                >
                    <DialogContent
                        className="sm:max-w-md"
                        onCloseAutoFocus={restoreCustomerActionFocus}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                Jadwalkan Tindak Lanjut Berikutnya
                            </DialogTitle>
                            <DialogDescription>
                                Jangan biarkan pelanggan terlupakan. Tetapkan
                                rencana dan waktu.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleScheduleFollowUp}
                            className="space-y-4 pt-2"
                        >
                            {followUpError && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {followUpError}
                                </p>
                            )}
                            {followUpSaving && (
                                <p
                                    role="status"
                                    className="text-sm text-muted-foreground"
                                >
                                    Menyimpan jadwal…
                                </p>
                            )}
                            <fieldset
                                disabled={followUpSaving}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <Label htmlFor="fu-date">
                                        Waktu Janji / Rencana *
                                    </Label>
                                    <Input
                                        id="fu-date"
                                        type="datetime-local"
                                        required
                                        value={fuDate}
                                        onChange={(e) =>
                                            setFuDate(e.target.value)
                                        }
                                        className="min-h-11"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="fu-notes">
                                        Rencana Tindakan *
                                    </Label>
                                    <Input
                                        id="fu-notes"
                                        required
                                        value={fuNotes}
                                        onChange={(e) =>
                                            setFuNotes(e.target.value)
                                        }
                                        placeholder="Konfirmasi kelengkapan berkas KTP dan NPWP..."
                                        className="min-h-11"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    aria-busy={followUpSaving}
                                    className="min-h-11 w-full"
                                >
                                    Jadwalkan Tindak Lanjut
                                </Button>
                            </fieldset>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Ubah Tahap Pipeline */}
                <Dialog open={stageOpen} onOpenChange={setStageOpen}>
                    <DialogContent
                        className="sm:max-w-md"
                        onCloseAutoFocus={restoreCustomerActionFocus}
                    >
                        <DialogHeader>
                            <DialogTitle>Perbarui Tahap Penjualan</DialogTitle>
                            <DialogDescription>
                                Transaksi:{' '}
                                {selectedCustomer?.active_deal?.vehicle_model}
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleUpdateStage}
                            className="space-y-4 pt-2"
                        >
                            <div className="space-y-1">
                                <Label htmlFor="stage-select">
                                    Tahap Berikutnya
                                </Label>
                                <Select
                                    value={nextStage}
                                    onValueChange={setNextStage}
                                >
                                    <SelectTrigger
                                        id="stage-select"
                                        className="min-h-11 w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lead">
                                            Lead
                                        </SelectItem>
                                        <SelectItem value="prospect">
                                            Prospect
                                        </SelectItem>
                                        <SelectItem value="hot_prospect">
                                            Hot Prospect
                                        </SelectItem>
                                        <SelectItem value="spk">
                                            SPK (Pemesanan)
                                        </SelectItem>
                                        {selectedCustomer?.active_deal
                                            ?.can_record_do && (
                                            <SelectItem value="do">
                                                DO (Delivery Order)
                                            </SelectItem>
                                        )}
                                        <SelectItem value="lost">
                                            Lost (Gagal Closing)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {nextStage === 'spk' && (
                                <div className="flex items-center gap-2 rounded-lg border p-3">
                                    <input
                                        type="checkbox"
                                        id="booking-fee"
                                        checked={bookingFee}
                                        onChange={(e) =>
                                            setBookingFee(e.target.checked)
                                        }
                                        className="size-4"
                                    />
                                    <Label
                                        htmlFor="booking-fee"
                                        className="text-sm font-normal"
                                    >
                                        Booking fee telah diterima dan
                                        terverifikasi sesuai kebijakan dealer.
                                    </Label>
                                </div>
                            )}

                            {nextStage === 'do' && (
                                <DoChecklist
                                    value={doChecklist}
                                    onChange={setDoChecklist}
                                />
                            )}

                            {nextStage === 'lost' && (
                                <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="lost-reason">
                                            Alasan Lost *
                                        </Label>
                                        <Select
                                            value={lostReason}
                                            onValueChange={setLostReason}
                                        >
                                            <SelectTrigger
                                                id="lost-reason"
                                                className="min-h-11 w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="competitor">
                                                    Membeli di kompetitor /
                                                    merek lain
                                                </SelectItem>
                                                <SelectItem value="price_budget">
                                                    Harga / anggaran belum cocok
                                                </SelectItem>
                                                <SelectItem value="credit_rejected">
                                                    Pengajuan leasing ditolak
                                                </SelectItem>
                                                <SelectItem value="no_response">
                                                    Tidak merespons follow-up
                                                </SelectItem>
                                                <SelectItem value="cancel_purchase">
                                                    Batal / menunda beli
                                                </SelectItem>
                                                <SelectItem value="other">
                                                    Alasan lainnya
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="stage-notes">
                                    Catatan Transisi
                                </Label>
                                <Input
                                    id="stage-notes"
                                    value={stageNotes}
                                    onChange={(e) =>
                                        setStageNotes(e.target.value)
                                    }
                                    placeholder="Keterangan pendukung kemajuan tahap..."
                                    className="min-h-11"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="min-h-11 w-full"
                                disabled={
                                    nextStage === 'do' &&
                                    !Object.values(doChecklist).every(Boolean)
                                }
                            >
                                Konfirmasi Perubahan Tahap
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Penugasan Ulang */}
                <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                    <DialogContent
                        className="sm:max-w-md"
                        onCloseAutoFocus={restoreCustomerActionFocus}
                    >
                        <DialogHeader>
                            <DialogTitle>Penugasan Ulang</DialogTitle>
                            <DialogDescription>
                                Pindahkan {selectedCustomer?.name} ke sales
                                lain.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleReassign}
                            className="space-y-4 pt-2"
                        >
                            <div className="space-y-1">
                                <Label htmlFor="reassign-sales">
                                    Sales Tujuan *
                                </Label>
                                <Combobox
                                    value={reassignSalesId}
                                    onValueChange={setReassignSalesId}
                                    options={assignableSales.map((sales) => ({
                                        value: String(sales.id),
                                        label: sales.name,
                                    }))}
                                    placeholder="Pilih sales"
                                    searchPlaceholder="Cari sales..."
                                    aria-label="Sales tujuan"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reassign-notes">Catatan</Label>
                                <Input
                                    id="reassign-notes"
                                    value={reassignNotes}
                                    onChange={(e) =>
                                        setReassignNotes(e.target.value)
                                    }
                                    placeholder="Alasan penugasan ulang..."
                                    className="min-h-11"
                                />
                            </div>
                            <Button type="submit" className="min-h-11 w-full">
                                Konfirmasi Penugasan
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Detail transaksi & riwayat (adaptif mobile/desktop) */}
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent
                        className="flex max-h-[calc(100dvh-2rem)] flex-col max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-2xl"
                        onOpenAutoFocus={(event) => {
                            event.preventDefault();
                            detailTitleRef.current?.focus();
                        }}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (
                                !activityOpen &&
                                !followUpOpen &&
                                !stageOpen &&
                                !reassignOpen
                            ) {
                                customerActionTriggerRef.current?.focus({
                                    preventScroll: true,
                                });
                            }
                        }}
                    >
                        <DialogHeader className="shrink-0">
                            <DialogTitle
                                ref={detailTitleRef}
                                tabIndex={-1}
                                className="mr-6 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                {selectedCustomer?.name ?? 'Riwayat pelanggan'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedCustomer?.phone}
                                {selectedCustomer?.email
                                    ? ` • ${selectedCustomer.email}`
                                    : ''}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        Sales PIC
                                    </div>
                                    <div className="font-medium">
                                        {selectedCustomer?.assigned_sales
                                            ?.name ?? 'Belum ditugaskan'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        Kontak terakhir
                                    </div>
                                    <div className="font-medium">
                                        {formatDate(
                                            selectedCustomer?.last_contact_at ??
                                                null,
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        Preferensi
                                    </div>
                                    <div className="font-medium">
                                        {selectedCustomer?.contact_channel_preference ??
                                            'Tidak ditentukan'}
                                    </div>
                                </div>
                            </div>

                            {selectedCustomer && (
                                <CustomerContactPreferences
                                    key={`${selectedCustomer.public_id}-${selectedCustomer.contact_channel_preference}-${selectedCustomer.opt_out}`}
                                    customer={selectedCustomer}
                                />
                            )}

                            {selectedCustomer?.active_deal && (
                                <div className="rounded-xl border p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold">
                                            {
                                                selectedCustomer.active_deal
                                                    .vehicle_model
                                            }
                                        </span>
                                        <StageBadge
                                            stage={
                                                selectedCustomer.active_deal
                                                    .current_stage
                                            }
                                        >
                                            {
                                                selectedCustomer.active_deal
                                                    .stage_label
                                            }
                                        </StageBadge>
                                        {selectedCustomer.active_deal
                                            .is_stagnant && (
                                            <Badge
                                                variant="destructive"
                                                className="text-[10px]"
                                            >
                                                Stagnan &gt;3 Hari
                                            </Badge>
                                        )}
                                    </div>
                                    {selectedCustomer.active_deal
                                        .estimated_value !== null && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Estimasi nilai:{' '}
                                            {new Intl.NumberFormat('id-ID', {
                                                style: 'currency',
                                                currency: 'IDR',
                                                maximumFractionDigits: 0,
                                            }).format(
                                                selectedCustomer.active_deal
                                                    .estimated_value,
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}

                            {selectedCustomer?.active_deal &&
                                !selectedCustomer.active_deal.is_closed &&
                                (role === 'sales' || role === 'supervisor') && (
                                    <ClosingMonthForm
                                        key={
                                            selectedCustomer.active_deal
                                                .public_id
                                        }
                                        transactionId={
                                            selectedCustomer.active_deal
                                                .public_id
                                        }
                                        month={
                                            selectedCustomer.active_deal
                                                .expected_closing_month ?? null
                                        }
                                    />
                                )}

                            {selectedCustomer?.next_follow_up && (
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <CalendarClock className="size-4" />
                                        Tindak lanjut berikutnya
                                    </div>
                                    <p className="mt-1 text-sm">
                                        {
                                            selectedCustomer.next_follow_up
                                                .plan_notes
                                        }
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {formatDate(
                                            selectedCustomer.next_follow_up
                                                .scheduled_at,
                                        )}
                                    </p>
                                </div>
                            )}

                            {currentCustomer && detailOpen && (
                                <CustomerHistory
                                    key={currentCustomer.public_id}
                                    customerId={currentCustomer.public_id}
                                    refreshKey={customers}
                                    onSelection={selectHistoryTransaction}
                                    onReply={replyToHistory}
                                    onEdit={editHistoryComment}
                                />
                            )}
                            {historyReady &&
                                selectedCustomer?.active_deal?.can_comment && (
                                    <form
                                        onSubmit={(event) =>
                                            editingCommentId !== null
                                                ? handleUpdateComment(
                                                      event,
                                                      editingCommentId,
                                                  )
                                                : handleCreateComment(
                                                      event,
                                                      replyParentId ??
                                                          undefined,
                                                  )
                                        }
                                        className="space-y-3"
                                    >
                                        <Label htmlFor="history-comment-body">
                                            {editingCommentId !== null
                                                ? 'Edit komentar'
                                                : replyParentId !== null
                                                  ? 'Balas komentar'
                                                  : 'Komentar baru'}
                                        </Label>
                                        <textarea
                                            id="history-comment-body"
                                            value={
                                                editingCommentId !== null
                                                    ? editBody
                                                    : replyParentId !== null
                                                      ? replyBody
                                                      : commentBody
                                            }
                                            onChange={(event) =>
                                                editingCommentId !== null
                                                    ? setEditBody(
                                                          event.target.value,
                                                      )
                                                    : replyParentId !== null
                                                      ? setReplyBody(
                                                            event.target.value,
                                                        )
                                                      : setCommentBody(
                                                            event.target.value,
                                                        )
                                            }
                                            required
                                            maxLength={2000}
                                            aria-invalid={Boolean(
                                                errors.body || errors.parent_id,
                                            )}
                                            aria-describedby={
                                                errors.body || errors.parent_id
                                                    ? 'history-comment-error'
                                                    : undefined
                                            }
                                            className="min-h-28 w-full rounded-md border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                                        />
                                        {(errors.body || errors.parent_id) && (
                                            <p
                                                id="history-comment-error"
                                                role="alert"
                                                className="text-sm text-destructive"
                                            >
                                                {errors.body ||
                                                    errors.parent_id}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <Button type="submit">
                                                {editingCommentId !== null
                                                    ? 'Simpan koreksi'
                                                    : replyParentId !== null
                                                      ? 'Kirim Balasan'
                                                      : 'Kirim Komentar'}
                                            </Button>
                                            {(editingCommentId !== null ||
                                                replyParentId !== null) && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingCommentId(
                                                            null,
                                                        );
                                                        setReplyParentId(null);
                                                        setEditBody('');
                                                        setReplyBody('');
                                                    }}
                                                >
                                                    Batal
                                                </Button>
                                            )}
                                        </div>
                                    </form>
                                )}
                        </div>

                        <fieldset
                            disabled={!historyReady}
                            data-comfortable-controls
                            className="grid shrink-0 grid-cols-2 gap-2 border-t pt-3 disabled:opacity-50 sm:grid-cols-3"
                        >
                            {canContact(selectedCustomer, 'phone') && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-auto min-h-11 min-w-0 gap-2 px-3 py-2 whitespace-normal"
                                >
                                    <a
                                        href={`tel:${selectedCustomer?.phone ?? ''}`}
                                    >
                                        <Phone className="size-4 text-emerald-600" />
                                        Telepon
                                    </a>
                                </Button>
                            )}
                            {canContact(selectedCustomer, 'whatsapp') && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-auto min-h-11 min-w-0 gap-2 px-3 py-2 whitespace-normal"
                                >
                                    <a
                                        href={formatPhoneLink(
                                            selectedCustomer?.phone ?? '',
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <MessageSquare className="size-4 text-emerald-500" />
                                        WhatsApp
                                    </a>
                                </Button>
                            )}
                            <Button
                                className="h-auto min-h-11 min-w-0 px-3 py-2 whitespace-normal"
                                onClick={() => {
                                    setDetailOpen(false);
                                    setActivityOpen(true);
                                }}
                            >
                                Catat Aktivitas
                            </Button>
                            <Button
                                variant="secondary"
                                className="h-auto min-h-11 min-w-0 px-3 py-2 whitespace-normal"
                                onClick={() => {
                                    setDetailOpen(false);
                                    setFollowUpOpen(true);
                                }}
                            >
                                Follow-Up
                            </Button>
                            {selectedCustomer?.active_deal &&
                                !selectedCustomer.active_deal.is_closed && (
                                    <Button
                                        variant="secondary"
                                        className="h-auto min-h-11 min-w-0 px-3 py-2 whitespace-normal"
                                        onClick={() => {
                                            setDetailOpen(false);
                                            openStage(
                                                selectedCustomer.active_deal!
                                                    .current_stage,
                                            );
                                        }}
                                    >
                                        Ubah Tahap
                                    </Button>
                                )}
                            <Button
                                asChild
                                variant="outline"
                                className="h-auto min-h-11 min-w-0 px-3 py-2 whitespace-normal"
                            >
                                <Link
                                    href={`/transactions/create?customer=${selectedCustomer?.public_id}`}
                                >
                                    Buat Transaksi Baru
                                </Link>
                            </Button>
                            {assignableSales.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="h-auto min-h-11 min-w-0 px-3 py-2 whitespace-normal"
                                    onClick={() => {
                                        setDetailOpen(false);
                                        setReassignOpen(true);
                                    }}
                                >
                                    Penugasan Ulang
                                </Button>
                            )}
                        </fieldset>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
