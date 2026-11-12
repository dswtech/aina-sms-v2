import { TransactionDetailModal } from '@/components/transaction-detail/transaction-detail-modal';
import { canContact } from '@/lib/customer-contact';
import { Head, Link, router } from '@inertiajs/react';
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
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type VehicleOption } from '@/components/transaction-fields';

export type CustomerItem = {
    public_id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    gender: string | null;
    birth_date: string | null;
    occupation: string | null;
    region_code: string | null;
    district_code: string | null;
    other_city: string | null;
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
        vehicle_model: string | null;
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
    vehicleOptions?: VehicleOption[];
    regions?: { code: string; name: string }[];
    districts?: { code: string; region_code: string; name: string }[];
    leasings?: { id: number; name: string }[];
    stages?: { value: string; label: string }[];
    lostReasons?: { value: string; label: string }[];
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
    vehicleOptions = [],
    regions = [],
    districts = [],
    leasings = [],
    stages = [],
    lostReasons = [],
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const customerActionTriggerRef = useRef<HTMLButtonElement | null>(null);
    // Detail and Ubah tahap share the Transactions page modal.
    const [detail, setDetail] = useState<{
        public_id: string;
        vehicle_model: string | null;
        customerName: string;
        stage: boolean;
        mode?: 'activities' | 'followups';
    } | null>(null);

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

    function openDetail(
        deal: { public_id: string; vehicle_model: string | null },
        customerName: string,
        stage: boolean,
        mode?: 'activities' | 'followups',
    ) {
        setDetail({
            public_id: deal.public_id,
            vehicle_model: deal.vehicle_model,
            customerName,
            stage,
            mode,
        });
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
                                                    {c.active_deal
                                                        .vehicle_model ??
                                                        'Belum dipilih'}
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
                                                disabled={!c.active_deal}
                                                title={
                                                    c.active_deal
                                                        ? undefined
                                                        : 'Belum ada transaksi yang dapat Anda lihat'
                                                }
                                                onClick={(event) => {
                                                    customerActionTriggerRef.current =
                                                        event.currentTarget;
                                                    openDetail(
                                                        c.active_deal!,
                                                        c.name,
                                                        false,
                                                        'activities',
                                                    );
                                                }}
                                            >
                                                Catat Aktivitas
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                disabled={!c.active_deal}
                                                title={
                                                    c.active_deal
                                                        ? undefined
                                                        : 'Belum ada transaksi yang dapat Anda lihat'
                                                }
                                                onClick={(event) => {
                                                    customerActionTriggerRef.current =
                                                        event.currentTarget;
                                                    openDetail(
                                                        c.active_deal!,
                                                        c.name,
                                                        false,
                                                        'followups',
                                                    );
                                                }}
                                            >
                                                Follow-Up
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="min-h-11 px-3"
                                                disabled={!c.active_deal}
                                                title={
                                                    c.active_deal
                                                        ? undefined
                                                        : 'Belum ada transaksi yang dapat Anda lihat'
                                                }
                                                onClick={(event) => {
                                                    customerActionTriggerRef.current =
                                                        event.currentTarget;
                                                    openDetail(
                                                        c.active_deal!,
                                                        c.name,
                                                        false,
                                                    );
                                                }}
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
                                                            openDetail(
                                                                c.active_deal!,
                                                                c.name,
                                                                true,
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
                                                    disabled={!c.active_deal}
                                                    title={
                                                        c.active_deal
                                                            ? undefined
                                                            : 'Belum ada transaksi yang dapat Anda lihat'
                                                    }
                                                    onClick={(event) => {
                                                        customerActionTriggerRef.current =
                                                            event.currentTarget;
                                                        openDetail(
                                                            c.active_deal!,
                                                            c.name,
                                                            false,
                                                        );
                                                    }}
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
                                                                openDetail(
                                                                    c.active_deal!,
                                                                    c.name,
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

                {/* Detail and Ubah tahap use the same modal as the Transactions page. */}
                <TransactionDetailModal
                    target={
                        detail && {
                            public_id: detail.public_id,
                            vehicle_model: detail.vehicle_model,
                            customer: { name: detail.customerName },
                        }
                    }
                    intent={
                        detail?.mode
                            ? { action: null, mode: detail.mode }
                            : detail?.stage
                              ? { action: null }
                              : null
                    }
                    onClose={() => setDetail(null)}
                    onCloseAutoFocus={restoreCustomerActionFocus}
                    regions={regions}
                    districts={districts}
                    leasings={leasings}
                    stages={stages}
                    lostReasons={lostReasons}
                    vehicleOptions={vehicleOptions}
                    assignableSales={assignableSales}
                />
            </div>
        </>
    );
}
