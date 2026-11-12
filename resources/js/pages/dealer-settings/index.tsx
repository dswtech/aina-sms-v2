import { DealerSettingsPage } from '@/components/dealer-settings-page';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

type Props = {
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    foa: string[];
};

export default function DealerSettings({ regions, districts, foa }: Props) {
    const errors = usePage().props.errors as Record<string, string>;
    const [selected, setSelected] = useState(() => new Set(foa));
    const [saving, setSaving] = useState(false);
    // Regions with saved FOA start open; later edits never open or close a region by themselves.
    const [startOpen] = useState(
        () =>
            new Set(
                districts
                    .filter((d) => foa.includes(d.code))
                    .map((d) => d.region_code),
            ),
    );
    const foaChanged =
        selected.size !== foa.length || foa.some((code) => !selected.has(code));

    const toggle = (code: string) =>
        setSelected((current) => {
            const next = new Set(current);
            if (!next.delete(code)) next.add(code);
            return next;
        });

    return (
        <DealerSettingsPage title="Area & FOA">
            <Card>
                <CardHeader>
                    <CardTitle>Kecamatan FOA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Tandai kecamatan yang menjadi FOA dealer. Bawaan
                        sementara: seluruh Kabupaten Bandung Barat;
                        {selected.size} kecamatan dipilih.
                    </p>
                    {regions.map((region) => {
                        const items = districts.filter(
                            (d) => d.region_code === region.code,
                        );
                        const chosen = items.filter((d) =>
                            selected.has(d.code),
                        ).length;

                        return (
                            <details
                                key={region.code}
                                className="group rounded-lg border"
                                open={startOpen.has(region.code)}
                            >
                                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 font-medium">
                                    <ChevronRight
                                        aria-hidden="true"
                                        className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                                    />
                                    {region.name}
                                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                                        {chosen} dari {items.length} dipilih
                                    </span>
                                </summary>
                                <div className="grid gap-1 border-t px-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {items.map((d) => (
                                        <label
                                            key={d.code}
                                            className="flex min-h-11 items-center gap-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(d.code)}
                                                onChange={() => toggle(d.code)}
                                                aria-label={`${d.name}, ${region.name}`}
                                            />
                                            {d.name}
                                        </label>
                                    ))}
                                </div>
                            </details>
                        );
                    })}
                    <InputError message={errors?.districts} />
                    <Button
                        type="button"
                        className="min-h-11"
                        disabled={!foaChanged || saving}
                        onClick={() =>
                            router.patch(
                                '/dealer-settings/area-foa',
                                { districts: [...selected].sort() },
                                {
                                    preserveScroll: true,
                                    onStart: () => setSaving(true),
                                    onFinish: () => setSaving(false),
                                },
                            )
                        }
                    >
                        {saving ? 'Menyimpan…' : 'Simpan FOA'}
                    </Button>
                </CardContent>
            </Card>
        </DealerSettingsPage>
    );
}
