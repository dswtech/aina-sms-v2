import {
    AreaFields,
    Field,
    FinancingFields,
    areaPayload,
    emptyAreaFinancing,
    financingPayload,
    selectClass,
} from '@/components/transaction-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };
type Props = {
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    leasings: { id: number; name: string }[];
    sources: Option[];
    assignableSales: { id: number; name: string }[];
    supervisors: { id: number; name: string }[];
};
type FoundCustomer = {
    public_id: string;
    name: string;
    phone: string;
    social_media_account: string | null;
    assigned_sales: { name: string | null };
};

const CHANNELS: Option[] = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Lainnya' },
];
export default function TransactionCreate({
    regions,
    districts,
    leasings,
    sources,
    assignableSales,
    supervisors,
}: Props) {
    const errors = usePage().props.errors as Record<string, string>;
    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [social, setSocial] = useState('');
    const [picked, setPicked] = useState<FoundCustomer | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoundCustomer[]>([]);
    const [searchState, setSearchState] = useState<
        'idle' | 'loading' | 'error'
    >('idle');
    const [salesId, setSalesId] = useState('');
    const [model, setModel] = useState('');
    const [source, setSource] = useState(sources[0]?.value ?? 'walk_in');
    const [channel, setChannel] = useState('');
    const [closing, setClosing] = useState('');
    const [af, setAf] = useState(emptyAreaFinancing);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const touch =
        <T,>(set: (v: T) => void) =>
        (v: T) => {
            setDirty(true);
            set(v);
        };

    // Debounced, server-scoped customer search; stale responses are aborted.
    const controller = useRef<AbortController | null>(null);
    useEffect(() => {
        if (mode !== 'existing') return;
        const timer = setTimeout(async () => {
            controller.current?.abort();
            controller.current = new AbortController();
            setSearchState('loading');
            try {
                const response = await fetch(
                    `/transactions/customer-search?q=${encodeURIComponent(query)}`,
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.current.signal,
                    },
                );
                if (!response.ok) throw new Error('search');
                setResults((await response.json()).data);
                setSearchState('idle');
            } catch (error) {
                if ((error as Error).name !== 'AbortError')
                    setSearchState('error');
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [mode, query]);

    function leave() {
        if (
            dirty &&
            !window.confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')
        )
            return;
        if (window.history.length > 1) window.history.back();
        else router.visit('/transactions');
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        if (saving) return;
        const existing = mode === 'existing' ? picked : null;
        setSaving(true);
        router.post(
            '/transactions',
            {
                existing_customer_id: existing?.public_id ?? null,
                name: existing?.name ?? name,
                phone: existing?.phone ?? phone,
                social_media_account: existing ? null : social || null,
                sales_id: !existing && salesId ? Number(salesId) : null,
                vehicle_model: model,
                source,
                source_channel:
                    source === 'digital_ad' ? channel || null : null,
                expected_closing_month: closing || null,
                notes: notes || null,
                area: areaPayload(af),
                financing: financingPayload(af),
            },
            { onFinish: () => setSaving(false), preserveScroll: true },
        );
    }

    const err = (key: string) => errors[key];

    return (
        <>
            <Head title="Transaksi Baru" />
            <form
                onSubmit={submit}
                onChange={() => setDirty(true)}
                className="mx-auto max-w-6xl space-y-4 p-4"
            >
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-xl font-semibold">Transaksi Baru</h1>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={leave}
                    >
                        Kembali
                    </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {assignableSales.length > 0 ? (
                                <Field
                                    id="sales"
                                    label="Sales penanggung jawab"
                                    error={err('sales_id')}
                                >
                                    <select
                                        id="sales"
                                        className={selectClass}
                                        disabled={mode === 'existing'}
                                        value={salesId}
                                        onChange={(e) =>
                                            touch(setSalesId)(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            {mode === 'existing'
                                                ? 'Mengikuti penugasan pelanggan'
                                                : 'Pilih Sales'}
                                        </option>
                                        {assignableSales.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            ) : (
                                <p className="text-sm">
                                    Sales: <strong>Anda</strong>
                                </p>
                            )}
                            {supervisors.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Supervisor:{' '}
                                    {supervisors.map((s) => s.name).join(', ')}
                                </p>
                            )}
                            <Field
                                id="model"
                                label="Unit yang diminati"
                                error={err('vehicle_model')}
                            >
                                <Input
                                    id="model"
                                    className="min-h-11"
                                    value={model}
                                    onChange={(e) =>
                                        touch(setModel)(e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                id="source"
                                label="Sumber lead"
                                error={err('source')}
                            >
                                <select
                                    id="source"
                                    className={selectClass}
                                    value={source}
                                    onChange={(e) =>
                                        touch(setSource)(e.target.value)
                                    }
                                >
                                    {sources.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            {source === 'digital_ad' && (
                                <Field
                                    id="channel"
                                    label="Kanal digital"
                                    error={err('source_channel')}
                                >
                                    <select
                                        id="channel"
                                        className={selectClass}
                                        value={channel}
                                        onChange={(e) =>
                                            touch(setChannel)(e.target.value)
                                        }
                                    >
                                        <option value="">Pilih kanal</option>
                                        {CHANNELS.map((c) => (
                                            <option
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                            <Field
                                id="closing"
                                label="Estimasi bulan closing (opsional)"
                                error={err('expected_closing_month')}
                            >
                                <Input
                                    id="closing"
                                    type="month"
                                    className="min-h-11"
                                    value={closing}
                                    onChange={(e) =>
                                        touch(setClosing)(e.target.value)
                                    }
                                />
                            </Field>
                            <FinancingFields
                                value={af}
                                onChange={touch(setAf)}
                                leasings={leasings}
                                errors={errors}
                            />
                            <Field
                                id="notes"
                                label="Keterangan"
                                error={err('notes')}
                            >
                                <textarea
                                    id="notes"
                                    rows={3}
                                    maxLength={2000}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={notes}
                                    onChange={(e) =>
                                        touch(setNotes)(e.target.value)
                                    }
                                />
                            </Field>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pelanggan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div
                                    role="group"
                                    aria-label="Jenis pelanggan"
                                    className="flex gap-2"
                                >
                                    {(['new', 'existing'] as const).map((m) => (
                                        <Button
                                            key={m}
                                            type="button"
                                            className="min-h-11"
                                            variant={
                                                mode === m
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            aria-pressed={mode === m}
                                            onClick={() => {
                                                setMode(m);
                                                setPicked(null);
                                            }}
                                        >
                                            {m === 'new'
                                                ? 'Pelanggan Baru'
                                                : 'Pelanggan Lama'}
                                        </Button>
                                    ))}
                                </div>
                                {mode === 'new' ? (
                                    <>
                                        <Field
                                            id="name"
                                            label="Nama"
                                            error={err('name')}
                                        >
                                            <Input
                                                id="name"
                                                className="min-h-11"
                                                value={name}
                                                onChange={(e) =>
                                                    touch(setName)(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="phone"
                                            label="Nomor telepon"
                                            error={
                                                err('phone') ??
                                                err('duplicate_customer')
                                            }
                                        >
                                            <Input
                                                id="phone"
                                                inputMode="tel"
                                                className="min-h-11"
                                                value={phone}
                                                onChange={(e) =>
                                                    touch(setPhone)(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        {err('duplicate_customer') && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="min-h-11"
                                                onClick={() => {
                                                    setMode('existing');
                                                    setQuery(phone);
                                                }}
                                            >
                                                Cari sebagai Pelanggan Lama
                                            </Button>
                                        )}
                                        <Field
                                            id="social"
                                            label="Akun media sosial (opsional)"
                                            error={err('social_media_account')}
                                        >
                                            <Input
                                                id="social"
                                                maxLength={255}
                                                className="min-h-11"
                                                value={social}
                                                onChange={(e) =>
                                                    touch(setSocial)(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Field
                                            id="search"
                                            label="Cari nama atau nomor"
                                            error={
                                                err('existing_customer_id') ??
                                                err('sales_id')
                                            }
                                        >
                                            <Input
                                                id="search"
                                                className="min-h-11"
                                                value={query}
                                                onChange={(e) =>
                                                    setQuery(e.target.value)
                                                }
                                            />
                                        </Field>
                                        <div
                                            aria-live="polite"
                                            className="text-sm text-muted-foreground"
                                        >
                                            {searchState === 'loading' &&
                                                'Mencari…'}
                                            {searchState === 'error' && (
                                                <>
                                                    Pencarian gagal.{' '}
                                                    <button
                                                        type="button"
                                                        className="underline"
                                                        onClick={() =>
                                                            setQuery(
                                                                query + ' ',
                                                            )
                                                        }
                                                    >
                                                        Coba lagi
                                                    </button>
                                                </>
                                            )}
                                            {searchState === 'idle' &&
                                                results.length === 0 &&
                                                'Tidak ada pelanggan yang cocok.'}
                                        </div>
                                        <ul className="space-y-1">
                                            {results.map((c) => (
                                                <li key={c.public_id}>
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            picked?.public_id ===
                                                            c.public_id
                                                        }
                                                        className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted aria-pressed:border-primary"
                                                        onClick={() => {
                                                            setPicked(c);
                                                            setDirty(true);
                                                        }}
                                                    >
                                                        <strong>
                                                            {c.name}
                                                        </strong>{' '}
                                                        · {c.phone}
                                                        <br />
                                                        <span className="text-muted-foreground">
                                                            Sales:{' '}
                                                            {c.assigned_sales
                                                                .name ?? '-'}
                                                            {c.social_media_account
                                                                ? ` · ${c.social_media_account}`
                                                                : ''}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        {picked === null && (
                                            <p className="text-sm">
                                                Pilih satu pelanggan untuk
                                                melanjutkan.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Area Transaksi (KTP/STNK)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <AreaFields
                                    value={af}
                                    onChange={touch(setAf)}
                                    regions={regions}
                                    districts={districts}
                                    errors={errors}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        className="min-h-11"
                        disabled={
                            saving || (mode === 'existing' && picked === null)
                        }
                    >
                        {saving ? 'Menyimpan…' : 'Simpan transaksi'}
                    </Button>
                </div>
            </form>
        </>
    );
}
