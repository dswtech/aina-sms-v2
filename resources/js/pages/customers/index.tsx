import { Head, router } from '@inertiajs/react';
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
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
        is_stagnant: boolean;
        estimated_value: number | null;
        comments: Array<{
            id: number;
            body: string;
            author_name: string | null;
            created_at: string;
            edited_at: string | null;
            can_edit: boolean;
            replies: Array<{
                id: number;
                body: string;
                author_name: string | null;
                created_at: string;
                edited_at: string | null;
                can_edit: boolean;
            }>;
        }>;
    } | null;
    next_follow_up: {
        id: number;
        scheduled_at: string;
        plan_notes: string;
        status: string;
    } | null;
    stage_history: Array<{
        from_stage: string | null;
        from_stage_label: string | null;
        to_stage: string;
        to_stage_label: string;
        notes: string | null;
        actor_name: string | null;
        created_at: string;
    }>;
    recent_activities: Array<{
        type: string;
        type_label: string;
        notes: string;
        occurred_at: string;
        user_name: string | null;
    }>;
};

type Props = {
    customers: {
        data: CustomerItem[];
        current_page: number;
        last_page: number;
        total: number;
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
    const [search, setSearch] = useState(filters.search || '');
    const [createOpen, setCreateOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);
    const [followUpOpen, setFollowUpOpen] = useState(false);
    const [stageOpen, setStageOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [transactionOpen, setTransactionOpen] = useState(false);
    const [reassignOpen, setReassignOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerItem | null>(null);

    // Form states
    const [leadName, setLeadName] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [leadModel, setLeadModel] = useState('');
    const [leadSource, setLeadSource] = useState('walk_in');
    const [leadNotes, setLeadNotes] = useState('');

    const [actType, setActType] = useState('call');
    const [actNotes, setActNotes] = useState('');

    const [fuDate, setFuDate] = useState('');
    const [fuNotes, setFuNotes] = useState('');

    const [nextStage, setNextStage] = useState('prospect');
    const [stageNotes, setStageNotes] = useState('');
    const [lostReason, setLostReason] = useState('price_budget');
    const [bookingFee, setBookingFee] = useState(false);

    const [txVehicleModel, setTxVehicleModel] = useState('');
    const [txEstimatedValue, setTxEstimatedValue] = useState('');
    const [txSource, setTxSource] = useState('walk_in');
    const [txNotes, setTxNotes] = useState('');

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

    function openDetail(customer: CustomerItem) {
        setSelectedCustomer(customer);
        setDetailOpen(true);
    }

    function handleCreateLead(e: React.FormEvent) {
        e.preventDefault();
        router.post(
            '/customers',
            {
                name: leadName,
                phone: leadPhone,
                vehicle_model: leadModel,
                source: leadSource,
                notes: leadNotes,
            },
            {
                onSuccess: () => {
                    setCreateOpen(false);
                    setLeadName('');
                    setLeadPhone('');
                    setLeadModel('');
                    setLeadNotes('');
                },
            },
        );
    }

    function handleLogActivity(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer) return;
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
            },
        );
    }

    function handleScheduleFollowUp(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer) return;
        router.post(
            `/customers/${selectedCustomer.public_id}/follow-ups`,
            {
                scheduled_at: fuDate,
                plan_notes: fuNotes,
            },
            {
                onSuccess: () => {
                    setFollowUpOpen(false);
                    setFuNotes('');
                    setFuDate('');
                },
            },
        );
    }

    function handleUpdateStage(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer || !selectedCustomer.active_deal) return;
        router.patch(
            `/transactions/${selectedCustomer.active_deal.public_id}/stage`,
            {
                to_stage: nextStage,
                notes: stageNotes,
                booking_fee_confirmed: bookingFee,
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

    function handleCreateTransaction(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomer) return;
        router.post(
            `/customers/${selectedCustomer.public_id}/transactions`,
            {
                vehicle_model: txVehicleModel,
                estimated_value: txEstimatedValue
                    ? Number(txEstimatedValue)
                    : undefined,
                source: txSource,
                notes: txNotes || undefined,
            },
            {
                onSuccess: () => {
                    setTransactionOpen(false);
                    setTxVehicleModel('');
                    setTxEstimatedValue('');
                    setTxNotes('');
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

            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-24 sm:px-6 sm:pt-8 md:pb-10 lg:px-8">
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

                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="min-h-11 w-full gap-2 sm:w-auto">
                                <Plus className="size-4" />
                                <span>Tambah Lead Baru</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Tambah Lead Baru</DialogTitle>
                                <DialogDescription>
                                    Catat calon pelanggan baru beserta unit yang
                                    diminati.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleCreateLead}
                                className="space-y-4 pt-2"
                            >
                                <div className="space-y-1">
                                    <Label htmlFor="lead-name">
                                        Nama Pelanggan *
                                    </Label>
                                    <Input
                                        id="lead-name"
                                        required
                                        value={leadName}
                                        onChange={(e) =>
                                            setLeadName(e.target.value)
                                        }
                                        placeholder="Contoh: Budi Santoso"
                                        className="min-h-11"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lead-phone">
                                        Nomor Telepon / WhatsApp *
                                    </Label>
                                    <Input
                                        id="lead-phone"
                                        required
                                        value={leadPhone}
                                        onChange={(e) =>
                                            setLeadPhone(e.target.value)
                                        }
                                        placeholder="081234567890"
                                        className="min-h-11"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lead-model">
                                        Model Kendaraan Diminati *
                                    </Label>
                                    <Input
                                        id="lead-model"
                                        required
                                        value={leadModel}
                                        onChange={(e) =>
                                            setLeadModel(e.target.value)
                                        }
                                        placeholder="Contoh: Stargazer Prime, Creta"
                                        className="min-h-11"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lead-source">
                                        Sumber Lead
                                    </Label>
                                    <Select
                                        value={leadSource}
                                        onValueChange={setLeadSource}
                                    >
                                        <SelectTrigger
                                            id="lead-source"
                                            className="min-h-11 w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="walk_in">
                                                Walk-in Showroom
                                            </SelectItem>
                                            <SelectItem value="digital_ad">
                                                Iklan Digital / Medsos
                                            </SelectItem>
                                            <SelectItem value="referral">
                                                Referral Pelanggan
                                            </SelectItem>
                                            <SelectItem value="exhibition">
                                                Pameran / Mall
                                            </SelectItem>
                                            <SelectItem value="call">
                                                Telepon Masuk
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lead-notes">
                                        Catatan Tambahan
                                    </Label>
                                    <Input
                                        id="lead-notes"
                                        value={leadNotes}
                                        onChange={(e) =>
                                            setLeadNotes(e.target.value)
                                        }
                                        placeholder="Minat DP minim, rencana beli minggu depan..."
                                        className="min-h-11"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="min-h-11 w-full"
                                >
                                    Simpan Lead
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </header>

                {/* Filter Tabs & Search */}
                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 border-b pb-3">
                        <Button
                            variant={
                                filters.tab === 'all' ? 'default' : 'outline'
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
                                filters.tab === 'active' ? 'default' : 'outline'
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
                            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                            <Input
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
                            onClick={() => applyFilters(filters.tab, search)}
                            className="min-h-11 px-4"
                        >
                            Cari
                        </Button>
                    </div>
                </div>

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
                                className="overflow-hidden shadow-sm transition hover:shadow-md"
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
                                                    <Badge
                                                        variant="outline"
                                                        className="font-medium"
                                                    >
                                                        {
                                                            c.active_deal
                                                                .stage_label
                                                        }
                                                    </Badge>
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
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 min-w-11 gap-1.5 px-3"
                                            >
                                                <a href={`tel:${c.phone}`}>
                                                    <Phone className="size-4 text-emerald-600" />
                                                    <span className="xs:inline hidden">
                                                        Telepon
                                                    </span>
                                                </a>
                                            </Button>

                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 min-w-11 gap-1.5 px-3"
                                            >
                                                <a
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

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setActivityOpen(true);
                                                }}
                                            >
                                                Catat Aktivitas
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setFollowUpOpen(true);
                                                }}
                                            >
                                                Follow-Up
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                onClick={() => openDetail(c)}
                                            >
                                                Detail
                                            </Button>

                                            {c.active_deal &&
                                                !c.active_deal.is_closed && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="min-h-11 px-3"
                                                        onClick={() => {
                                                            setSelectedCustomer(
                                                                c,
                                                            );
                                                            setNextStage(
                                                                c.active_deal!
                                                                    .current_stage,
                                                            );
                                                            setStageOpen(true);
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
                                        className="align-top hover:bg-muted/30"
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
                                                    <Badge
                                                        variant={
                                                            c.active_deal
                                                                .is_closed
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {
                                                            c.active_deal
                                                                .stage_label
                                                        }
                                                    </Badge>
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
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
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
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="min-h-10"
                                                    onClick={() =>
                                                        openDetail(c)
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
                                                            onClick={() => {
                                                                setSelectedCustomer(
                                                                    c,
                                                                );
                                                                setNextStage(
                                                                    c
                                                                        .active_deal!
                                                                        .current_stage,
                                                                );
                                                                setStageOpen(
                                                                    true,
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

                {/* Dialog: Catat Aktivitas */}
                <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
                    <DialogContent className="sm:max-w-md">
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
                            <Button type="submit" className="min-h-11 w-full">
                                Simpan Aktivitas
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Jadwalkan Next Follow-Up */}
                <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
                    <DialogContent className="sm:max-w-md">
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
                            <div className="space-y-1">
                                <Label htmlFor="fu-date">
                                    Waktu Janji / Rencana *
                                </Label>
                                <Input
                                    id="fu-date"
                                    type="datetime-local"
                                    required
                                    value={fuDate}
                                    onChange={(e) => setFuDate(e.target.value)}
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
                                    onChange={(e) => setFuNotes(e.target.value)}
                                    placeholder="Konfirmasi kelengkapan berkas KTP dan NPWP..."
                                    className="min-h-11"
                                />
                            </div>
                            <Button type="submit" className="min-h-11 w-full">
                                Jadwalkan Tindak Lanjut
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Ubah Tahap Pipeline */}
                <Dialog open={stageOpen} onOpenChange={setStageOpen}>
                    <DialogContent className="sm:max-w-md">
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
                                        <SelectItem value="do">
                                            DO (Delivery Order)
                                        </SelectItem>
                                        <SelectItem value="delivery">
                                            Delivery (Selesai)
                                        </SelectItem>
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

                            <Button type="submit" className="min-h-11 w-full">
                                Konfirmasi Perubahan Tahap
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Buat Transaksi Baru */}
                <Dialog
                    open={transactionOpen}
                    onOpenChange={setTransactionOpen}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Buat Transaksi Baru</DialogTitle>
                            <DialogDescription>
                                Tambah unit baru untuk {selectedCustomer?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleCreateTransaction}
                            className="space-y-4 pt-2"
                        >
                            <div className="space-y-1">
                                <Label htmlFor="tx-model">
                                    Model Kendaraan *
                                </Label>
                                <Input
                                    id="tx-model"
                                    required
                                    value={txVehicleModel}
                                    onChange={(e) =>
                                        setTxVehicleModel(e.target.value)
                                    }
                                    placeholder="Contoh: Stargazer Prime"
                                    className="min-h-11"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tx-value">
                                    Estimasi Nilai (Rp)
                                </Label>
                                <Input
                                    id="tx-value"
                                    type="number"
                                    value={txEstimatedValue}
                                    onChange={(e) =>
                                        setTxEstimatedValue(e.target.value)
                                    }
                                    placeholder="0"
                                    className="min-h-11"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tx-source">Sumber</Label>
                                <Select
                                    value={txSource}
                                    onValueChange={setTxSource}
                                >
                                    <SelectTrigger
                                        id="tx-source"
                                        className="min-h-11 w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="walk_in">
                                            Walk-in Showroom
                                        </SelectItem>
                                        <SelectItem value="digital_ad">
                                            Iklan Digital / Medsos
                                        </SelectItem>
                                        <SelectItem value="referral">
                                            Referral Pelanggan
                                        </SelectItem>
                                        <SelectItem value="exhibition">
                                            Pameran / Mall
                                        </SelectItem>
                                        <SelectItem value="call">
                                            Telepon Masuk
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tx-notes">Catatan</Label>
                                <Input
                                    id="tx-notes"
                                    value={txNotes}
                                    onChange={(e) => setTxNotes(e.target.value)}
                                    placeholder="Catatan tambahan..."
                                    className="min-h-11"
                                />
                            </div>
                            <Button type="submit" className="min-h-11 w-full">
                                Simpan Transaksi
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Penugasan Ulang */}
                <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                    <DialogContent className="sm:max-w-md">
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
                                <Select
                                    value={reassignSalesId}
                                    onValueChange={setReassignSalesId}
                                >
                                    <SelectTrigger
                                        id="reassign-sales"
                                        className="min-h-11 w-full"
                                    >
                                        <SelectValue placeholder="Pilih sales" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignableSales.map((sales) => (
                                            <SelectItem
                                                key={sales.id}
                                                value={String(sales.id)}
                                            >
                                                {sales.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                    <DialogContent className="max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
                            <DialogDescription>
                                {selectedCustomer?.phone}
                                {selectedCustomer?.email
                                    ? ` • ${selectedCustomer.email}`
                                    : ''}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1 max-sm:max-h-none">
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

                            {selectedCustomer?.active_deal && (
                                <div className="rounded-xl border p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold">
                                            {
                                                selectedCustomer.active_deal
                                                    .vehicle_model
                                            }
                                        </span>
                                        <Badge
                                            variant={
                                                selectedCustomer.active_deal
                                                    .is_closed
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {
                                                selectedCustomer.active_deal
                                                    .stage_label
                                            }
                                        </Badge>
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

                            <div>
                                <h4 className="text-sm font-semibold">
                                    Riwayat tahap
                                </h4>
                                {selectedCustomer &&
                                selectedCustomer.stage_history.length > 0 ? (
                                    <ol className="mt-2 space-y-3 border-l pl-4">
                                        {selectedCustomer.stage_history.map(
                                            (history, index) => (
                                                <li
                                                    key={`${history.to_stage}-${index}`}
                                                    className="relative"
                                                >
                                                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                                                    <div className="text-sm font-medium">
                                                        {history.from_stage_label
                                                            ? `${history.from_stage_label} → ${history.to_stage_label}`
                                                            : history.to_stage_label}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            history.created_at,
                                                        )}
                                                        {history.actor_name
                                                            ? ` • ${history.actor_name}`
                                                            : ''}
                                                    </div>
                                                    {history.notes && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {history.notes}
                                                        </p>
                                                    )}
                                                </li>
                                            ),
                                        )}
                                    </ol>
                                ) : (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Belum ada riwayat tahap.
                                    </p>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold">
                                    Aktivitas terbaru
                                </h4>
                                {selectedCustomer &&
                                selectedCustomer.recent_activities.length >
                                    0 ? (
                                    <ul className="mt-2 space-y-3">
                                        {selectedCustomer.recent_activities.map(
                                            (activity, index) => (
                                                <li
                                                    key={`${activity.occurred_at}-${index}`}
                                                    className="rounded-lg border p-3"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline">
                                                            {
                                                                activity.type_label
                                                            }
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(
                                                                activity.occurred_at,
                                                            )}
                                                            {activity.user_name
                                                                ? ` • ${activity.user_name}`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm">
                                                        {activity.notes}
                                                    </p>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                ) : (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Belum ada aktivitas tercatat.
                                    </p>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold">
                                    Komentar & diskusi
                                </h4>
                                {selectedCustomer?.active_deal ? (
                                    <>
                                        {selectedCustomer.active_deal.comments
                                            .length > 0 ? (
                                            <ul className="mt-2 space-y-3">
                                                {selectedCustomer.active_deal.comments.map(
                                                    (comment) => (
                                                        <li
                                                            key={comment.id}
                                                            className="rounded-lg border p-3"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-sm font-medium">
                                                                    {comment.author_name ??
                                                                        'Anonim'}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {formatDate(
                                                                        comment.created_at,
                                                                    )}
                                                                </span>
                                                                {comment.edited_at && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        (diedit{' '}
                                                                        {formatDate(
                                                                            comment.edited_at,
                                                                        )}
                                                                        )
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {editingCommentId ===
                                                            comment.id ? (
                                                                <form
                                                                    onSubmit={(
                                                                        e,
                                                                    ) =>
                                                                        handleUpdateComment(
                                                                            e,
                                                                            comment.id,
                                                                        )
                                                                    }
                                                                    className="mt-2 space-y-2"
                                                                >
                                                                    <textarea
                                                                        value={
                                                                            editBody
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setEditBody(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        className="min-h-[60px] w-full rounded-md border bg-background p-2 text-sm"
                                                                        required
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            type="submit"
                                                                            size="sm"
                                                                            className="min-h-9"
                                                                        >
                                                                            Simpan
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="min-h-9"
                                                                            onClick={() => {
                                                                                setEditingCommentId(
                                                                                    null,
                                                                                );
                                                                                setEditBody(
                                                                                    '',
                                                                                );
                                                                            }}
                                                                        >
                                                                            Batal
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <p className="mt-1 text-sm">
                                                                    {
                                                                        comment.body
                                                                    }
                                                                </p>
                                                            )}

                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {comment.can_edit &&
                                                                    editingCommentId !==
                                                                        comment.id && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 px-2 text-xs"
                                                                            onClick={() => {
                                                                                setEditingCommentId(
                                                                                    comment.id,
                                                                                );
                                                                                setEditBody(
                                                                                    comment.body,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                    )}
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-xs"
                                                                    onClick={() =>
                                                                        setReplyParentId(
                                                                            comment.id,
                                                                        )
                                                                    }
                                                                >
                                                                    Balas
                                                                </Button>
                                                            </div>

                                                            {comment.replies
                                                                .length > 0 && (
                                                                <ul className="mt-3 space-y-2 border-l pl-3">
                                                                    {comment.replies.map(
                                                                        (
                                                                            reply,
                                                                        ) => (
                                                                            <li
                                                                                key={
                                                                                    reply.id
                                                                                }
                                                                                className="rounded-md bg-muted/40 p-2"
                                                                            >
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="text-sm font-medium">
                                                                                        {reply.author_name ??
                                                                                            'Anonim'}
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {formatDate(
                                                                                            reply.created_at,
                                                                                        )}
                                                                                    </span>
                                                                                    {reply.edited_at && (
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            (diedit{' '}
                                                                                            {formatDate(
                                                                                                reply.edited_at,
                                                                                            )}
                                                                                            )
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {editingCommentId ===
                                                                                reply.id ? (
                                                                                    <form
                                                                                        onSubmit={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleUpdateComment(
                                                                                                e,
                                                                                                reply.id,
                                                                                            )
                                                                                        }
                                                                                        className="mt-2 space-y-2"
                                                                                    >
                                                                                        <textarea
                                                                                            value={
                                                                                                editBody
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                setEditBody(
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                            className="min-h-[60px] w-full rounded-md border bg-background p-2 text-sm"
                                                                                            required
                                                                                        />
                                                                                        <div className="flex gap-2">
                                                                                            <Button
                                                                                                type="submit"
                                                                                                size="sm"
                                                                                                className="min-h-9"
                                                                                            >
                                                                                                Simpan
                                                                                            </Button>
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="min-h-9"
                                                                                                onClick={() => {
                                                                                                    setEditingCommentId(
                                                                                                        null,
                                                                                                    );
                                                                                                    setEditBody(
                                                                                                        '',
                                                                                                    );
                                                                                                }}
                                                                                            >
                                                                                                Batal
                                                                                            </Button>
                                                                                        </div>
                                                                                    </form>
                                                                                ) : (
                                                                                    <p className="mt-1 text-sm">
                                                                                        {
                                                                                            reply.body
                                                                                        }
                                                                                    </p>
                                                                                )}

                                                                                {reply.can_edit &&
                                                                                    editingCommentId !==
                                                                                        reply.id && (
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="mt-1 h-8 px-2 text-xs"
                                                                                            onClick={() => {
                                                                                                setEditingCommentId(
                                                                                                    reply.id,
                                                                                                );
                                                                                                setEditBody(
                                                                                                    reply.body,
                                                                                                );
                                                                                            }}
                                                                                        >
                                                                                            Edit
                                                                                        </Button>
                                                                                    )}
                                                                            </li>
                                                                        ),
                                                                    )}
                                                                </ul>
                                                            )}

                                                            {replyParentId ===
                                                                comment.id && (
                                                                <form
                                                                    onSubmit={(
                                                                        e,
                                                                    ) =>
                                                                        handleCreateComment(
                                                                            e,
                                                                            comment.id,
                                                                        )
                                                                    }
                                                                    className="mt-3 space-y-2"
                                                                >
                                                                    <textarea
                                                                        value={
                                                                            replyBody
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setReplyBody(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="Tulis balasan..."
                                                                        className="min-h-[60px] w-full rounded-md border bg-background p-2 text-sm"
                                                                        required
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            type="submit"
                                                                            size="sm"
                                                                            className="min-h-9"
                                                                        >
                                                                            Kirim
                                                                            Balasan
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="min-h-9"
                                                                            onClick={() => {
                                                                                setReplyParentId(
                                                                                    null,
                                                                                );
                                                                                setReplyBody(
                                                                                    '',
                                                                                );
                                                                            }}
                                                                        >
                                                                            Batal
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            )}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Belum ada komentar.
                                            </p>
                                        )}

                                        <form
                                            onSubmit={(e) =>
                                                handleCreateComment(e)
                                            }
                                            className="mt-3 space-y-2"
                                        >
                                            <textarea
                                                value={commentBody}
                                                onChange={(e) =>
                                                    setCommentBody(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Tulis komentar..."
                                                className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                size="sm"
                                                className="min-h-9"
                                            >
                                                Kirim Komentar
                                            </Button>
                                        </form>
                                    </>
                                ) : (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Tidak ada transaksi aktif.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t pt-3">
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-11 flex-1 gap-2"
                            >
                                <a
                                    href={`tel:${selectedCustomer?.phone ?? ''}`}
                                >
                                    <Phone className="size-4 text-emerald-600" />
                                    Telepon
                                </a>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-11 flex-1 gap-2"
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
                            <Button
                                className="min-h-11 flex-1"
                                onClick={() => {
                                    setDetailOpen(false);
                                    setActivityOpen(true);
                                }}
                            >
                                Catat Aktivitas
                            </Button>
                            <Button
                                variant="secondary"
                                className="min-h-11 flex-1"
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
                                        className="min-h-11 flex-1"
                                        onClick={() => {
                                            setDetailOpen(false);
                                            setNextStage(
                                                selectedCustomer.active_deal!
                                                    .current_stage,
                                            );
                                            setStageOpen(true);
                                        }}
                                    >
                                        Ubah Tahap
                                    </Button>
                                )}
                            <Button
                                variant="outline"
                                className="min-h-11 flex-1"
                                onClick={() => {
                                    setDetailOpen(false);
                                    setTxVehicleModel(
                                        selectedCustomer?.active_deal
                                            ?.vehicle_model ?? '',
                                    );
                                    setTransactionOpen(true);
                                }}
                            >
                                Buat Transaksi Baru
                            </Button>
                            {assignableSales.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="min-h-11 flex-1"
                                    onClick={() => {
                                        setDetailOpen(false);
                                        setReassignOpen(true);
                                    }}
                                >
                                    Penugasan Ulang
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </>
    );
}
