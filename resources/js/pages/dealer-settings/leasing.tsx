import { DealerSettingsPage } from '@/components/dealer-settings-page';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Leasing = {
    id: number;
    name: string;
    is_active: boolean;
    is_monitored: boolean;
};

function LeasingRow({ leasing }: { leasing: Leasing }) {
    const [row, setRow] = useState(leasing);
    const [saving, setSaving] = useState(false);
    const errors = usePage().props.errors as Record<string, string>;
    const dirty = JSON.stringify(row) !== JSON.stringify(leasing);

    return (
        <li className="space-y-2 rounded-lg border p-3">
            <div>
                <Label htmlFor={`leasing-${leasing.id}`}>Nama leasing</Label>
                <Input
                    id={`leasing-${leasing.id}`}
                    className="mt-1 min-h-11"
                    value={row.name}
                    onChange={(e) => setRow({ ...row, name: e.target.value })}
                />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                    className="ml-auto min-h-11"
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
            </div>
            {dirty && errors.name && <InputError message={errors.name} />}
        </li>
    );
}

export default function DealerLeasing({ leasings }: { leasings: Leasing[] }) {
    const errors = usePage().props.errors as Record<string, string>;
    const [newLeasing, setNewLeasing] = useState('');

    return (
        <DealerSettingsPage title="Leasing kerja sama">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar leasing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Leasing pantauan muncul sebagai batang sendiri di
                        laporan; lainnya masuk Kredit Lain. Leasing yang sudah
                        dipakai tidak dihapus, hanya dinonaktifkan.
                    </p>
                    <ul className="grid gap-3 md:grid-cols-2">
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
                            <Label htmlFor="new-leasing">Tambah leasing</Label>
                            <Input
                                id="new-leasing"
                                className="mt-1 min-h-11"
                                value={newLeasing}
                                onChange={(e) => setNewLeasing(e.target.value)}
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
        </DealerSettingsPage>
    );
}
