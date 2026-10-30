import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    CalendarClock,
    CheckCircle2,
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
    };
    filters: {
        search: string;
        tab: string;
    };
    counts: {
        all: number;
        follow_up_today: number;
        uncontacted: number;
        active: number;
        purchased: number;
    };
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

export default function CustomersIndex({ customers, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [createOpen, setCreateOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);
    const [followUpOpen, setFollowUpOpen] = useState(false);
    const [stageOpen, setStageOpen] = useState(false);
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

    function applyFilters(nextTab = filters.tab, query = search) {
        router.get(
            '/customers',
            {
                tab: nextTab !== 'all' ? nextTab : undefined,
                search: query ? query : undefined,
            },
            { preserveState: true, replace: true },
        );
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

                {/* Customer List Content */}
                <div className="mt-6 space-y-4">
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
            </main>
        </>
    );
}
