import { useState } from 'react';
import { ChevronDown, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    areaDistricts,
    areaRegions,
    areaMasterSource,
} from '@/lib/bandung-raya-districts';
import { updateAreaDeal } from '@/lib/area-preview';
import type { AreaChoice, AreaDeal } from '@/lib/area-preview';

export function AreaMaster({
    foaCodes,
    onSave,
}: {
    foaCodes: ReadonlySet<string>;
    onSave: (codes: Set<string>) => void;
}) {
    const [draft, setDraft] = useState(() => new Set(foaCodes));
    const [search, setSearch] = useState('');
    const [region, setRegion] = useState('all');
    const [onlyFoa, setOnlyFoa] = useState(false);
    const [saved, setSaved] = useState(false);
    const dirty =
        [...draft].sort().join('|') !== [...foaCodes].sort().join('|');
    const rows = areaDistricts.filter(
        (row) =>
            (region === 'all' || row.regionCode === region) &&
            (!onlyFoa || draft.has(row.code)) &&
            `${row.name} ${row.code}`
                .toLocaleLowerCase('id')
                .includes(search.trim().toLocaleLowerCase('id')),
    );
    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Area & FOA</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    106 kecamatan resmi · lima kabupaten/kota · {draft.size} FOA
                    contoh
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Pengaturan Dealer → Area & FOA · khusus Admin
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="area-region-filter">Kabupaten/Kota</Label>
                    <Combobox
                        id="area-region-filter"
                        value={region}
                        onValueChange={setRegion}
                        options={[
                            { value: 'all', label: 'Semua wilayah' },
                            ...areaRegions.map((row) => ({
                                value: row.code,
                                label: row.name,
                            })),
                        ]}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="area-search">Cari kecamatan</Label>
                    <Input
                        id="area-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nama atau kode kecamatan…"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                    id="area-foa-only"
                    checked={onlyFoa}
                    onCheckedChange={(value) => setOnlyFoa(value === true)}
                />
                <Label htmlFor="area-foa-only">FOA saja</Label>
                <span className="ml-auto text-xs text-muted-foreground">
                    {rows.length} kecamatan ditampilkan
                </span>
            </div>
            <div className="space-y-3">
                {areaRegions.map((government) => {
                    const districts = rows.filter(
                        (row) => row.regionCode === government.code,
                    );
                    if (!districts.length) return null;
                    return (
                        <Collapsible
                            key={`${government.code}:${region}:${search}:${onlyFoa}`}
                            defaultOpen={
                                !!search ||
                                region !== 'all' ||
                                government.code === '32.17'
                            }
                            className="group/area overflow-hidden rounded-xl border bg-card"
                        >
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                >
                                    <span>
                                        {government.name}
                                        <span className="ml-2 font-normal text-muted-foreground">
                                            {districts.length}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        className="size-4 shrink-0 transition-transform group-data-[state=open]/area:rotate-180 motion-reduce:transition-none"
                                        aria-hidden="true"
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="border-t">
                                    {districts.map((district) => (
                                        <div
                                            key={district.code}
                                            className="striped-row flex min-h-14 items-center gap-3 px-5 py-2"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <Label
                                                    htmlFor={`foa-${district.code}`}
                                                    className="leading-6"
                                                >
                                                    {district.name}
                                                </Label>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {district.code}
                                                </p>
                                            </div>
                                            <Checkbox
                                                id={`foa-${district.code}`}
                                                aria-label={`FOA ${district.name} · ${government.name}`}
                                                checked={draft.has(
                                                    district.code,
                                                )}
                                                onCheckedChange={(value) => {
                                                    setDraft((previous) => {
                                                        const next = new Set(
                                                            previous,
                                                        );
                                                        if (value === true)
                                                            next.add(
                                                                district.code,
                                                            );
                                                        else
                                                            next.delete(
                                                                district.code,
                                                            );
                                                        return next;
                                                    });
                                                    setSaved(false);
                                                }}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                FOA
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
                {!rows.length && (
                    <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                        Tidak ada kecamatan yang sesuai filter.
                    </p>
                )}
            </div>
            <div className="rounded-xl border px-5 py-4">
                <p className="text-sm font-medium">Kota Lain</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Pilihan khusus di luar lima wilayah. Hanya nama kota yang
                    dicatat dan selalu masuk Area lain; tidak dapat ditandai
                    FOA.
                </p>
            </div>
            <div className="flex flex-col justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center">
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    Perubahan FOA berlaku untuk DO berikutnya. Pengelompokan DO
                    yang sudah tercatat tetap mengikuti snapshot saat DO.
                </p>
                <Button
                    disabled={!dirty}
                    onClick={() => {
                        onSave(new Set(draft));
                        setSaved(true);
                    }}
                >
                    Simpan pilihan
                </Button>
            </div>
            {saved && (
                <p role="status" className="text-sm text-primary">
                    Pilihan FOA diterapkan pada preview. Snapshot DO sebelumnya
                    tidak berubah.
                </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
                Sumber:{' '}
                <a
                    href={areaMasterSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                >
                    BPS SIG · kode Kemendagri
                </a>
                . Snapshot {areaMasterSource.retrievedAt}. Nama/kode resmi tidak
                diedit di layar ini; penanda FOA adalah konfigurasi contoh
                dealer.
            </p>
        </section>
    );
}

function AreaFields({
    deal,
    foaCodes,
    onSave,
}: {
    deal: AreaDeal;
    foaCodes: ReadonlySet<string>;
    onSave: (deal: AreaDeal) => void;
}) {
    const [choice, setChoice] = useState<AreaChoice>({ ...deal.area });
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const locked = !!deal.doMonth && !deal.doReversed;
    const isFoa = locked
        ? deal.snapshot?.isFoa
        : !!choice.districtCode && foaCodes.has(choice.districtCode);
    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                try {
                    onSave(
                        updateAreaDeal(
                            deal,
                            choice,
                            areaDistricts,
                            areaRegions,
                        ),
                    );
                    setSaved(true);
                    setError('');
                } catch (failure) {
                    setError(
                        failure instanceof Error
                            ? failure.message
                            : 'Area belum dapat diterapkan.',
                    );
                }
            }}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                    Transaksi Contoh #{String(deal.id).padStart(3, '0')}
                </p>
                <Badge variant="secondary">
                    {locked ? 'Sudah DO' : 'Prospect'}
                </Badge>
            </div>
            {locked && (
                <p className="flex gap-2 rounded-lg bg-muted p-3 text-sm leading-6">
                    <LockKeyhole
                        className="mt-1 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    Area dan status FOA dikunci saat DO. Perubahan master tidak
                    mengubah snapshot ini.
                </p>
            )}
            <div className="space-y-2">
                <Label htmlFor="transaction-area-region">Kabupaten/Kota</Label>
                <Combobox
                    id="transaction-area-region"
                    disabled={locked}
                    value={choice.regionCode ?? 'none'}
                    options={[
                        { value: 'none', label: 'Belum diisi' },
                        ...areaRegions.map((row) => ({
                            value: row.code,
                            label: row.name,
                        })),
                        { value: 'other', label: 'Kota Lain' },
                    ]}
                    onValueChange={(value) => {
                        setChoice({
                            regionCode: value === 'none' ? null : value,
                            districtCode: null,
                            otherCity: '',
                        });
                        setSaved(false);
                        setError('');
                    }}
                />
            </div>
            {choice.regionCode && choice.regionCode !== 'other' && (
                <div className="space-y-2">
                    <Label htmlFor="transaction-area-district">Kecamatan</Label>
                    <Combobox
                        id="transaction-area-district"
                        disabled={locked}
                        value={choice.districtCode ?? ''}
                        placeholder="Pilih kecamatan"
                        searchPlaceholder="Cari kecamatan…"
                        options={areaDistricts
                            .filter(
                                (row) => row.regionCode === choice.regionCode,
                            )
                            .map((row) => ({
                                value: row.code,
                                label: row.name,
                            }))}
                        onValueChange={(value) => {
                            setChoice((previous) => ({
                                ...previous,
                                districtCode: value,
                            }));
                            setSaved(false);
                            setError('');
                        }}
                    />
                </div>
            )}
            {choice.regionCode === 'other' && (
                <div className="space-y-2">
                    <Label htmlFor="transaction-other-city">Nama kota</Label>
                    <Input
                        id="transaction-other-city"
                        value={choice.otherCity}
                        disabled={locked}
                        required
                        maxLength={100}
                        placeholder="Contoh: Cianjur"
                        onChange={(event) => {
                            setChoice((previous) => ({
                                ...previous,
                                otherCity: event.target.value,
                            }));
                            setSaved(false);
                            setError('');
                        }}
                    />
                    <p className="text-xs text-muted-foreground">
                        Kecamatan tidak diminta. Dicatat sebagai Area lain pada
                        laporan.
                    </p>
                </div>
            )}
            {(choice.districtCode || choice.regionCode === 'other') && (
                <p className="text-sm">
                    <Badge variant="secondary">
                        {isFoa ? 'FOA dealer' : 'Area lain'}
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                        {locked
                            ? 'Sesuai snapshot saat DO'
                            : 'Sesuai pilihan FOA saat ini'}
                    </span>
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {saved && (
                <p role="status" className="text-sm text-primary">
                    Area diterapkan pada transaksi contoh. Laporan DO tetap
                    mengikuti snapshot penjualan yang sudah tercatat.
                </p>
            )}
            {!locked && <Button type="submit">Terapkan di preview</Button>}
        </form>
    );
}

export function AreaTransactionPreview({
    deals,
    sampleIds,
    foaCodes,
    onSave,
}: {
    deals: AreaDeal[];
    sampleIds: number[];
    foaCodes: ReadonlySet<string>;
    onSave: (deal: AreaDeal) => void;
}) {
    const [selected, setSelected] = useState(sampleIds[0]);
    const deal = deals.find((row) => row.id === selected)!;
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Coba input area transaksi</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Area pelanggan pada transaksi</DialogTitle>
                    <DialogDescription>
                        Data contoh. Field ini direncanakan berada di detail
                        transaksi, dengan acuan alamat KTP/STNK. Kecamatan wajib
                        lengkap sebelum DO; Kota Lain wajib nama kota. Tidak
                        menyimpan ke server.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="area-sample">Transaksi contoh</Label>
                    <Combobox
                        id="area-sample"
                        value={String(selected)}
                        options={sampleIds.map((id) => ({
                            value: String(id),
                            label: `Transaksi #${String(id).padStart(3, '0')} · ${deals.find((row) => row.id === id)?.doMonth ? 'Sudah DO' : 'Prospect'}`,
                        }))}
                        onValueChange={(value) => setSelected(Number(value))}
                    />
                </div>
                <AreaFields
                    key={deal.id}
                    deal={deal}
                    foaCodes={foaCodes}
                    onSave={onSave}
                />
            </DialogContent>
        </Dialog>
    );
}
