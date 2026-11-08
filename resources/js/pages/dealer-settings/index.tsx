import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Leasing = {
    id: number;
    name: string;
    is_active: boolean;
    is_monitored: boolean;
};
type Props = {
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    foa: string[];
    leasings: Leasing[];
};

function LeasingRow({ leasing }: { leasing: Leasing }) {
    const [row, setRow] = useState(leasing);
    const [saving, setSaving] = useState(false);
    const errors = usePage().props.errors as Record<string, string>;
    const dirty = JSON.stringify(row) !== JSON.stringify(leasing);

    return (
        <li className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
            <div className="min-w-48 flex-1">
                <Label htmlFor={`leasing-${leasing.id}`}>Nama leasing</Label>
                <Input
                    id={`leasing-${leasing.id}`}
                    className="mt-1 min-h-11"
                    value={row.name}
                    onChange={(e) => setRow({ ...row, name: e.target.value })}
                />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) =>
                        setRow({ ...row, is_active: e.target.checked })
                    }
                />
                Aktif
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={row.is_monitored}
                    onChange={(e) =>
                        setRow({ ...row, is_monitored: e.target.checked })
                    }
                />
                Pantauan
            </label>
            <Button
                type="button"
                className="min-h-11"
                disabled={!dirty || saving}
                aria-label={`Simpan ${leasing.name}`}
                onClick={() =>
                    router.patch(
                        `/dealer-settings/leasing/${leasing.id}`,
                        {
                            name: row.name,
                            is_active: row.is_active,
                            is_monitored: row.is_monitored,
                        },
                        {
                            preserveScroll: true,
                            onStart: () => setSaving(true),
                            onFinish: () => setSaving(false),
                        },
                    )
                }
            >
                {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
            {dirty && errors.name && <InputError message={errors.name} />}
        </li>
    );
}

export default function DealerSettings({
    regions,
    districts,
    foa,
    leasings,
}: Props) {
    const errors = usePage().props.errors as Record<string, string>;
    const [selected, setSelected] = useState(() => new Set(foa));
    const [savingFoa, setSavingFoa] = useState(false);
    const [newLeasing, setNewLeasing] = useState('');
    const foaChanged =
        selected.size !== foa.length || foa.some((code) => !selected.has(code));

    const toggle = (code: string) =>
        setSelected((current) => {
            const next = new Set(current);
            if (!next.delete(code)) next.add(code);
            return next;
        });

    return (
        <>
            <Head title="Pengaturan Dealer" />
            <div className="mx-auto w-full max-w-5xl space-y-6 px-5 pt-8 pb-28 sm:px-8">
                <h1 className="text-2xl font-semibold">Pengaturan Dealer</h1>
                <p className="text-sm text-muted-foreground">
                    Perubahan master berlaku untuk transaksi berikutnya.
                    Snapshot DO yang sudah tercatat tidak ditulis ulang.
                </p>

                <Card>
                    <CardHeader>
                        <CardTitle>Area & FOA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Tandai kecamatan yang menjadi FOA dealer. Awalnya
                            kosong; {selected.size} kecamatan dipilih.
                        </p>
                        {regions.map((region) => (
                            <fieldset key={region.code} className="space-y-2">
                                <legend className="font-medium">
                                    {region.name}
                                </legend>
                                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {districts
                                        .filter(
                                            (d) =>
                                                d.region_code === region.code,
                                        )
                                        .map((d) => (
                                            <label
                                                key={d.code}
                                                className="flex min-h-11 items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(
                                                        d.code,
                                                    )}
                                                    onChange={() =>
                                                        toggle(d.code)
                                                    }
                                                    aria-label={`${d.name}, ${region.name}`}
                                                />
                                                {d.name}
                                            </label>
                                        ))}
                                </div>
                            </fieldset>
                        ))}
                        <InputError message={errors?.districts} />
                        <Button
                            type="button"
                            className="min-h-11"
                            disabled={!foaChanged || savingFoa}
                            onClick={() =>
                                router.patch(
                                    '/dealer-settings/area-foa',
                                    { districts: [...selected].sort() },
                                    {
                                        preserveScroll: true,
                                        onStart: () => setSavingFoa(true),
                                        onFinish: () => setSavingFoa(false),
                                    },
                                )
                            }
                        >
                            {savingFoa ? 'Menyimpan…' : 'Simpan FOA'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Leasing kerja sama</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Leasing pantauan muncul sebagai batang sendiri di
                            laporan; lainnya masuk Kredit Lain. Leasing yang
                            sudah dipakai tidak dihapus, hanya dinonaktifkan.
                        </p>
                        <ul className="space-y-2">
                            {leasings.map((leasing) => (
                                <LeasingRow
                                    key={`${leasing.id}-${leasing.name}-${leasing.is_active}-${leasing.is_monitored}`}
                                    leasing={leasing}
                                />
                            ))}
                        </ul>
                        <form
                            className="flex flex-wrap items-end gap-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                router.post(
                                    '/dealer-settings/leasing',
                                    { name: newLeasing },
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setNewLeasing(''),
                                    },
                                );
                            }}
                        >
                            <div className="min-w-48 flex-1">
                                <Label htmlFor="new-leasing">
                                    Tambah leasing
                                </Label>
                                <Input
                                    id="new-leasing"
                                    className="mt-1 min-h-11"
                                    value={newLeasing}
                                    onChange={(e) =>
                                        setNewLeasing(e.target.value)
                                    }
                                />
                                <InputError message={errors?.name} />
                            </div>
                            <Button
                                type="submit"
                                className="min-h-11"
                                disabled={newLeasing.trim() === ''}
                            >
                                Tambah
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
