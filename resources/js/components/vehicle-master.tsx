import InputError from '@/components/input-error';
import {
    selectClass,
    vehiclePriceRange,
} from '@/components/transaction-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export type VehicleType = { id: number; name: string; is_active: boolean };
export type VehicleModel = {
    id: number;
    vehicle_type_id: number;
    name: string;
    price_min: number | null;
    price_max: number | null;
    is_active: boolean;
};

type Draft = {
    id: number | null;
    vehicle_type_id: string;
    name: string;
    price_min: string;
    price_max: string;
    is_active: boolean;
};

const emptyDraft: Draft = {
    id: null,
    vehicle_type_id: '',
    name: '',
    price_min: '',
    price_max: '',
    is_active: true,
};

const toPrice = (value: string) => (value.trim() === '' ? null : Number(value));

function ModelDialog({
    draft,
    types,
    onClose,
}: {
    draft: Draft | null;
    types: VehicleType[];
    onClose: () => void;
}) {
    const errors = usePage().props.errors as Record<string, string>;
    const [form, setForm] = useState<Draft>(draft ?? emptyDraft);
    const [saving, setSaving] = useState(false);
    const editing = form.id !== null;

    function submit(event: React.FormEvent) {
        event.preventDefault();
        const payload = {
            vehicle_type_id: Number(form.vehicle_type_id),
            name: form.name,
            price_min: toPrice(form.price_min),
            price_max: toPrice(form.price_max),
            ...(editing ? { is_active: form.is_active } : {}),
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: onClose,
        };
        if (editing) {
            router.patch(
                `/dealer-settings/vehicle-models/${form.id}`,
                payload,
                options,
            );
        } else {
            router.post('/dealer-settings/vehicle-models', payload, options);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editing ? 'Ubah model' : 'Tambah model'}
                    </DialogTitle>
                    <DialogDescription>
                        Kisaran harga bersifat opsional dan hanya menjadi
                        petunjuk bagi Sales.
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-3" onSubmit={submit}>
                    <div className="space-y-1">
                        <Label htmlFor="vm-type">Jenis kendaraan</Label>
                        <select
                            id="vm-type"
                            className={selectClass}
                            value={form.vehicle_type_id}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    vehicle_type_id: e.target.value,
                                })
                            }
                        >
                            <option value="">Pilih jenis</option>
                            {types
                                .filter(
                                    (t) =>
                                        t.is_active ||
                                        String(t.id) === form.vehicle_type_id,
                                )
                                .map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                        </select>
                        <InputError message={errors?.vehicle_type_id} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="vm-name">Nama model</Label>
                        <Input
                            id="vm-name"
                            className="min-h-11"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />
                        <InputError message={errors?.name} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="vm-min">Harga dari (Rp)</Label>
                            <Input
                                id="vm-min"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                className="min-h-11"
                                value={form.price_min}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        price_min: e.target.value,
                                    })
                                }
                            />
                            <InputError message={errors?.price_min} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="vm-max">Sampai (Rp)</Label>
                            <Input
                                id="vm-max"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                className="min-h-11"
                                value={form.price_max}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        price_max: e.target.value,
                                    })
                                }
                            />
                            <InputError message={errors?.price_max} />
                        </div>
                    </div>
                    {editing && (
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        is_active: e.target.checked,
                                    })
                                }
                            />
                            Aktif
                        </label>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            className="min-h-11"
                            disabled={
                                saving ||
                                form.name.trim() === '' ||
                                form.vehicle_type_id === ''
                            }
                        >
                            {saving ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function TypeHeader({ type, count }: { type: VehicleType; count: number }) {
    const [name, setName] = useState(type.name);
    const errors = usePage().props.errors as Record<string, string>;
    const patch = (data: { name: string } | { is_active: boolean }) =>
        router.patch(`/dealer-settings/vehicle-types/${type.id}`, data, {
            preserveScroll: true,
        });

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
                <Label htmlFor={`vt-${type.id}`}>Jenis ({count} model)</Label>
                <Input
                    id={`vt-${type.id}`}
                    className="mt-1 min-h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                {name !== type.name && errors?.name && (
                    <InputError message={errors.name} />
                )}
            </div>
            <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={name.trim() === '' || name === type.name}
                aria-label={`Simpan jenis ${type.name}`}
                onClick={() => patch({ name })}
            >
                Simpan
            </Button>
            <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => patch({ is_active: !type.is_active })}
            >
                {type.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
        </div>
    );
}

export function VehicleMaster({
    types,
    models,
}: {
    types: VehicleType[];
    models: VehicleModel[];
}) {
    const errors = usePage().props.errors as Record<string, string>;
    const [newType, setNewType] = useState('');
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const query = search.trim().toLowerCase();
    const typeName = (id: number) =>
        types.find((t) => t.id === id)?.name ?? '-';
    const rows = models.filter(
        (m) =>
            (showInactive || m.is_active) &&
            m.name.toLowerCase().includes(query),
    );

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Sales memilih model dari daftar ini; kendaraan wajib terisi saat
                transaksi masuk tahap SPK. Model yang sudah dipakai tidak
                dihapus, hanya dinonaktifkan.
            </p>
            <Card>
                <CardHeader>
                    <CardTitle>Jenis kendaraan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {types.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Belum ada jenis kendaraan. Tambahkan jenis lebih
                            dulu (mis. MPV, SUV, Pickup).
                        </p>
                    )}
                    {types
                        .filter((t) => showInactive || t.is_active)
                        .map((type) => (
                            <div
                                key={`${type.id}-${type.name}-${type.is_active}`}
                                className="rounded-lg border p-3"
                            >
                                <TypeHeader
                                    type={type}
                                    count={
                                        models.filter(
                                            (m) =>
                                                m.vehicle_type_id === type.id,
                                        ).length
                                    }
                                />
                            </div>
                        ))}
                    <form
                        className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            router.post(
                                '/dealer-settings/vehicle-types',
                                { name: newType },
                                {
                                    preserveScroll: true,
                                    onSuccess: () => setNewType(''),
                                },
                            );
                        }}
                    >
                        <div className="min-w-48 flex-1">
                            <Label htmlFor="new-vehicle-type">
                                Tambah jenis kendaraan
                            </Label>
                            <Input
                                id="new-vehicle-type"
                                className="mt-1 min-h-11"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                            />
                            <InputError message={errors?.name} />
                        </div>
                        <Button
                            type="submit"
                            className="min-h-11"
                            disabled={newType.trim() === ''}
                        >
                            Tambah jenis
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Model kendaraan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            className="min-h-11 max-w-xs"
                            placeholder="Cari model…"
                            aria-label="Cari model"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) =>
                                    setShowInactive(e.target.checked)
                                }
                            />
                            Tampilkan nonaktif
                        </label>
                        <Button
                            type="button"
                            className="ml-auto min-h-11"
                            disabled={types.length === 0}
                            onClick={() => setDraft(emptyDraft)}
                        >
                            Tambah model
                        </Button>
                    </div>
                    {rows.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Belum ada model yang cocok.
                        </p>
                    )}
                    <ul className="divide-y rounded-lg border">
                        {rows.map((m) => (
                            <li
                                key={m.id}
                                className="flex flex-wrap items-center gap-3 px-3 py-2"
                            >
                                <span className="min-w-40 flex-1 font-medium">
                                    {m.name}
                                </span>
                                <span className="text-sm">
                                    {typeName(m.vehicle_type_id)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {vehiclePriceRange(
                                        m.price_min,
                                        m.price_max,
                                    ) ?? 'Harga tidak diisi'}
                                </span>
                                <span className="text-sm">
                                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    aria-label={`Ubah ${m.name}`}
                                    onClick={() =>
                                        setDraft({
                                            id: m.id,
                                            vehicle_type_id: String(
                                                m.vehicle_type_id,
                                            ),
                                            name: m.name,
                                            price_min:
                                                m.price_min === null
                                                    ? ''
                                                    : String(m.price_min),
                                            price_max:
                                                m.price_max === null
                                                    ? ''
                                                    : String(m.price_max),
                                            is_active: m.is_active,
                                        })
                                    }
                                >
                                    Ubah
                                </Button>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            {draft && (
                <ModelDialog
                    key={draft.id ?? 'new'}
                    draft={draft}
                    types={types}
                    onClose={() => setDraft(null)}
                />
            )}
        </div>
    );
}
