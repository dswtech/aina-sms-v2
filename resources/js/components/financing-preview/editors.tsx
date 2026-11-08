import { useState } from 'react';
import { Check, LockKeyhole, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { syntheticDeals, updateFinancing } from '@/lib/financing-preview';
import type {
    Financing,
    FinancingDeal,
    Leasing,
} from '@/lib/financing-preview';

function LeasingEditor({
    lender,
    lenders,
    onSave,
}: {
    lender?: Leasing;
    lenders: Leasing[];
    onSave: (value: Leasing) => void;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(lender?.name ?? '');
    const [primary, setPrimary] = useState(lender?.primary ?? false);
    const [active, setActive] = useState(lender?.active ?? true);
    const [error, setError] = useState('');
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                if (value) {
                    setName(lender?.name ?? '');
                    setPrimary(lender?.primary ?? false);
                    setActive(lender?.active ?? true);
                    setError('');
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant={lender ? 'outline' : 'default'}
                    size={lender ? 'sm' : 'default'}
                    aria-label={lender ? `Edit ${lender.name}` : undefined}
                >
                    {lender ? (
                        <Pencil aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    {lender ? 'Edit' : 'Tambah leasing'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {lender ? 'Edit leasing' : 'Tambah leasing'}
                    </DialogTitle>
                    <DialogDescription>
                        Data contoh. Perubahan hanya berlaku di preview ini dan
                        akan hilang saat halaman dimuat ulang.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const normalized = name.trim();
                        if (!normalized) {
                            setError('Isi nama perusahaan leasing.');
                            return;
                        }
                        if (
                            lenders.some(
                                (row) =>
                                    row.id !== lender?.id &&
                                    row.name.toLocaleLowerCase('id') ===
                                        normalized.toLocaleLowerCase('id'),
                            )
                        ) {
                            setError(
                                'Nama leasing sudah ada. Gunakan nama yang berbeda.',
                            );
                            return;
                        }
                        onSave({
                            id: lender?.id ?? crypto.randomUUID(),
                            name: normalized,
                            primary,
                            active,
                        });
                        setOpen(false);
                    }}
                >
                    <div className="space-y-2">
                        <Label htmlFor={`lender-name-${lender?.id ?? 'new'}`}>
                            Nama leasing
                        </Label>
                        <Input
                            id={`lender-name-${lender?.id ?? 'new'}`}
                            value={name}
                            maxLength={100}
                            onChange={(event) => {
                                setName(event.target.value);
                                setError('');
                            }}
                            aria-invalid={!!error}
                            aria-describedby={
                                error ? 'leasing-name-error' : undefined
                            }
                            placeholder="Nama perusahaan leasing"
                            autoComplete="off"
                        />
                        {error && (
                            <p
                                id="leasing-name-error"
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {error}
                            </p>
                        )}
                    </div>
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id={`primary-${lender?.id ?? 'new'}`}
                            checked={primary}
                            onCheckedChange={(value) =>
                                setPrimary(value === true)
                            }
                        />
                        <div className="pt-2.5">
                            <Label htmlFor={`primary-${lender?.id ?? 'new'}`}>
                                Pantauan utama
                            </Label>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Tampil sebagai kategori tersendiri di laporan.
                                Leasing lain digabung ke Kredit Lain.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id={`active-${lender?.id ?? 'new'}`}
                            checked={active}
                            onCheckedChange={(value) =>
                                setActive(value === true)
                            }
                        />
                        <div className="pt-2.5">
                            <Label htmlFor={`active-${lender?.id ?? 'new'}`}>
                                Aktif untuk pilihan baru
                            </Label>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Menonaktifkan leasing tidak menghapus pilihan
                                pada transaksi contoh yang sudah ada.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit">Terapkan di preview</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function LeasingDirectory({
    lenders,
    onSave,
}: {
    lenders: Leasing[];
    onSave: (value: Leasing) => void;
}) {
    const [search, setSearch] = useState('');
    const rows = lenders.filter((row) =>
        row.name
            .toLocaleLowerCase('id')
            .includes(search.toLocaleLowerCase('id')),
    );
    return (
        <section className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <h2 className="text-xl font-semibold">
                        Leasing kerja sama
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {lenders.filter((row) => row.active).length} leasing
                        aktif · {lenders.filter((row) => row.primary).length}{' '}
                        pantauan utama
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Rencana lokasi menu: Pengaturan Dealer → Leasing. Khusus
                        Admin.
                    </p>
                </div>
                <LeasingEditor lenders={lenders} onSave={onSave} />
            </div>
            <div className="max-w-sm space-y-2">
                <Label htmlFor="leasing-search">Cari leasing</Label>
                <Input
                    id="leasing-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama perusahaan…"
                />
            </div>
            <div className="overflow-hidden rounded-xl border">
                <div className="hidden grid-cols-[minmax(0,1fr)_9rem_6rem_5rem] gap-3 border-b px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
                    <span>Perusahaan leasing</span>
                    <span>Pantauan utama</span>
                    <span>Status</span>
                    <span className="text-right">Aksi</span>
                </div>
                {rows.length === 0 && (
                    <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                        Tidak ada leasing dengan nama “{search}”.
                    </p>
                )}
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="striped-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_9rem_6rem_5rem]"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium wrap-break-word">
                                {row.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground md:hidden">
                                {row.primary
                                    ? 'Pantauan utama'
                                    : 'Masuk Kredit Lain'}{' '}
                                · {row.active ? 'Aktif' : 'Nonaktif'}
                            </p>
                        </div>
                        <span className="hidden items-center gap-1.5 text-sm md:flex">
                            {row.primary && (
                                <Check
                                    className="size-3.5 text-primary"
                                    aria-hidden="true"
                                />
                            )}
                            {row.primary ? 'Ya' : 'Tidak'}
                        </span>
                        <span className="hidden md:block">
                            <Badge variant="secondary">
                                {row.active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                        </span>
                        <div className="text-right">
                            <LeasingEditor
                                lender={row}
                                lenders={lenders}
                                onSave={onSave}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
                Leasing non-pantauan tetap bisa dipilih di form. Pada laporan,
                jumlahnya masuk Kredit Lain. Snapshot Realisasi DO tidak berubah
                ketika master leasing diedit.
            </p>
        </section>
    );
}

function FinancingEditor({
    deal,
    lenders,
    onSave,
}: {
    deal: FinancingDeal;
    lenders: Leasing[];
    onSave: (value: FinancingDeal) => void;
}) {
    const [financing, setFinancing] = useState<Financing>(deal.financing);
    const [leasingId, setLeasingId] = useState<string | null>(deal.leasingId);
    const [otherName, setOtherName] = useState(deal.otherName);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const locked = !!deal.doMonth;
    const missingLender = financing === 'credit' && !leasingId;
    return (
        <form
            className="space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                try {
                    onSave(
                        updateFinancing(deal, financing, leasingId, otherName),
                    );
                    setSaved(true);
                    setError('');
                } catch (failure) {
                    setError(
                        failure instanceof Error
                            ? failure.message
                            : 'Pilihan belum dapat diterapkan.',
                    );
                }
            }}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div>
                    <p className="font-medium">
                        Transaksi Contoh #{String(deal.id).padStart(3, '0')}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Kendaraan contoh · {locked ? 'Sudah DO' : 'Prospect'}
                    </p>
                </div>
                <Badge variant="secondary">
                    {locked ? 'Terkunci setelah DO' : 'Dapat diperbarui'}
                </Badge>
            </div>
            {locked && (
                <p className="flex gap-2 rounded-lg bg-muted p-3 text-sm leading-6">
                    <LockKeyhole
                        className="mt-1 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    Pembiayaan dikunci saat DO untuk menjaga laporan realisasi.
                </p>
            )}
            <fieldset disabled={locked} className="space-y-3">
                <legend className="mb-3 text-sm font-medium">
                    Rencana pembiayaan
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                    {[
                        {
                            value: '',
                            label: 'Belum ditentukan',
                            hint: 'Masih didiskusikan',
                        },
                        {
                            value: 'cash',
                            label: 'Cash',
                            hint: 'Pembayaran tunai',
                        },
                        {
                            value: 'credit',
                            label: 'Kredit',
                            hint: 'Melalui leasing',
                        },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${financing === (option.value || null) ? 'border-primary bg-primary/5' : 'hover:bg-muted'} ${locked ? 'cursor-default opacity-70' : ''}`}
                        >
                            <input
                                type="radio"
                                name="financing"
                                value={option.value}
                                checked={financing === (option.value || null)}
                                onChange={() => {
                                    setFinancing(
                                        option.value === 'cash'
                                            ? 'cash'
                                            : option.value === 'credit'
                                              ? 'credit'
                                              : null,
                                    );
                                    setLeasingId(null);
                                    setOtherName('');
                                    setSaved(false);
                                    setError('');
                                }}
                                className="mt-1 size-4 shrink-0 accent-primary"
                            />
                            <span>
                                <span className="block text-sm font-medium">
                                    {option.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                    {option.hint}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>
            {financing === 'credit' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="financing-leasing">
                            Leasing tujuan
                        </Label>
                        <Select
                            disabled={locked}
                            value={leasingId ?? 'unselected'}
                            onValueChange={(value) => {
                                setLeasingId(
                                    value === 'unselected' ? null : value,
                                );
                                setOtherName('');
                                setSaved(false);
                                setError('');
                            }}
                        >
                            <SelectTrigger
                                id="financing-leasing"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unselected">
                                    Belum dipilih
                                </SelectItem>
                                {lenders
                                    .filter(
                                        (row) =>
                                            row.active ||
                                            row.id === deal.leasingId,
                                    )
                                    .map((row) => (
                                        <SelectItem key={row.id} value={row.id}>
                                            {row.name}
                                            {!row.active ? ' (nonaktif)' : ''}
                                        </SelectItem>
                                    ))}
                                <SelectItem value="other">
                                    Kredit Lain
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs leading-5 text-muted-foreground">
                            Boleh belum dipilih saat Prospect. Harus dilengkapi
                            sebelum DO.
                        </p>
                    </div>
                    {leasingId === 'other' && (
                        <div className="space-y-2">
                            <Label htmlFor="other-leasing-name">
                                Nama leasing lainnya{' '}
                                <span aria-hidden="true">*</span>
                            </Label>
                            <Input
                                id="other-leasing-name"
                                disabled={locked}
                                required
                                maxLength={100}
                                value={otherName}
                                onChange={(event) => {
                                    setOtherName(event.target.value);
                                    setSaved(false);
                                    setError('');
                                }}
                                placeholder="Masukkan nama perusahaan leasing"
                            />
                            <p className="text-xs text-muted-foreground">
                                Tetap digabung sebagai Kredit Lain di laporan.
                            </p>
                        </div>
                    )}
                </div>
            )}
            {!locked && (
                <p className="text-sm leading-6 text-muted-foreground">
                    {financing === null
                        ? 'Belum tahu pilihan pelanggan? Data bisa dilengkapi pada follow-up berikutnya.'
                        : missingLender
                          ? 'Pilihan Kredit sudah dicatat. Leasing tujuan masih perlu dikonfirmasi.'
                          : 'Pilihan dapat berubah selama proses prospek dan akan dikunci saat DO.'}
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {saved && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-primary"
                >
                    <Check className="size-4" aria-hidden="true" />
                    Pilihan diterapkan di data contoh. Lihat perubahannya di
                    laporan Prospek.
                </p>
            )}
            {!locked && (
                <div className="flex flex-col items-start gap-3 border-t pt-5 sm:flex-row sm:items-center">
                    <Button type="submit">Terapkan di preview</Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                        Sementara di browser. Muat ulang untuk mengembalikan
                        data contoh.
                    </p>
                </div>
            )}
        </form>
    );
}

export function FinancingForm({
    deals,
    lenders,
    onSave,
}: {
    deals: FinancingDeal[];
    lenders: Leasing[];
    onSave: (value: FinancingDeal) => void;
}) {
    const samples = [
        syntheticDeals.find((row) => !row.doMonth && row.financing === null),
        syntheticDeals.find(
            (row) => !row.doMonth && row.financing === 'credit',
        ),
        syntheticDeals.find((row) => row.doMonth),
    ].filter((row): row is FinancingDeal => !!row);
    const [selectedId, setSelectedId] = useState(samples[0]?.id ?? deals[0].id);
    const deal = deals.find((row) => row.id === selectedId) ?? deals[0];
    // Keep sample identifiers stable as editing can change a sample's financing category.
    const [sampleIds] = useState(() => samples.map((row) => row.id));
    return (
        <section className="mx-auto max-w-3xl space-y-6">
            <div>
                <h2 className="text-xl font-semibold">
                    Pembiayaan di detail transaksi
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Coba alur pencatatan sejak Prospect, termasuk kondisi
                    terkunci setelah DO.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="sample-transaction">Transaksi contoh</Label>
                <Select
                    value={String(selectedId)}
                    onValueChange={(value) => setSelectedId(Number(value))}
                >
                    <SelectTrigger id="sample-transaction" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sampleIds.map((id) => {
                            const row = deals.find((item) => item.id === id);
                            return (
                                <SelectItem key={id} value={String(id)}>
                                    Transaksi #{String(id).padStart(3, '0')} ·{' '}
                                    {row?.doMonth ? 'Sudah DO' : 'Prospect'}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6">
                <FinancingEditor
                    key={deal.id}
                    deal={deal}
                    lenders={lenders}
                    onSave={onSave}
                />
            </div>
        </section>
    );
}
