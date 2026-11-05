import { ClosingMonthForm } from '@/components/team-performance';
import InputError from '@/components/input-error';
import { Head, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FilterPanel } from '@/components/filter-panel';
import { useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Transaction = {
    id: number;
    public_id: string;
    customer: { name: string; phone: string } | null;
    sales: { name: string; username: string } | null;
    vehicle_model: string;
    source: string;
    current_stage: string;
    stage_label: string;
    estimated_value: number | null;
    expected_closing_month: string | null;
    is_stagnant: boolean;
    last_activity_at: string | null;
    created_at: string;
    can_update: boolean;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type SalesUser = { id: number; name: string; username: string };

type Props = {
    transactions: Paginated<Transaction>;
    filters: {
        search: string;
        stage: string;
        tab: string;
        sales_id: number | null;
        date_from?: string | null;
        date_to?: string | null;
        source?: string | null;
    };
    sourceOptions?: string[];
    assignableSales: SalesUser[];
    stages: Array<{ value: string; label: string }>;
    lostReasons: Array<{ value: string; label: string }>;
};

const tabs = [
    { value: 'all', label: 'Semua' },
    { value: 'active', label: 'Aktif' },
    { value: 'stagnant', label: 'Stagnan' },
    { value: 'closed', label: 'Selesai' },
];

export default function TransactionsIndex({
    transactions,
    filters,
    assignableSales,
    stages,
    lostReasons,
    sourceOptions = [],
}: Props) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [search, setSearch] = useState(filters.search);
    const [stage, setStage] = useState(filters.stage);
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [source, setSource] = useState(filters.source ?? '');
    const [salesId, setSalesId] = useState(
        filters.sales_id ? String(filters.sales_id) : '',
    );
    const [selected, setSelected] = useState<Transaction | null>(null);
    const [toStage, setToStage] = useState('');
    const [notes, setNotes] = useState('');
    const [bookingFee, setBookingFee] = useState(false);
    const [lostReason, setLostReason] = useState('');
    const [lostNotes, setLostNotes] = useState('');

    const applyFilters = (nextTab?: string) => {
        router.get(
            '/transactions',
            {
                search,
                stage,
                tab: nextTab ?? filters.tab,
                sales_id: salesId || null,
                date_from: dateFrom || null,
                date_to: dateTo || null,
                source: source || null,
            },
            { preserveState: true, replace: true },
        );
    };

    const openUpdate = (transaction: Transaction) => {
        setSelected(transaction);
        setToStage(transaction.current_stage);
        setNotes('');
        setBookingFee(false);
        setLostReason('');
        setLostNotes('');
    };

    const submitUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        router.patch(
            `/transactions/${selected.public_id}/stage`,
            {
                to_stage: toStage,
                notes: notes || null,
                booking_fee_confirmed: bookingFee,
                lost_reason: lostReason || null,
                lost_notes: lostNotes || null,
            },
            {
                onSuccess: () => setSelected(null),
            },
        );
    };

    return (
        <>
            <Head title="Transaksi" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                            Transaksi
                        </h1>
                        <p className="mt-2 max-w-prose text-muted-foreground">
                            Pantau pipeline, filter transaksi, dan perbarui
                            tahap dari satu halaman.
                        </p>
                    </div>
                </div>

                <FilterPanel
                    className="mt-6"
                    title="Filter transaksi"
                    summary={`${[filters.search, filters.stage, filters.sales_id, filters.date_from, filters.date_to, filters.source, filters.tab !== 'all' ? filters.tab : null].filter(Boolean).length} filter aktif`}
                >
                    <div
                        className={`grid gap-3 sm:grid-cols-2 ${assignableSales.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
                    >
                        <div>
                            <Label htmlFor="search">Pencarian</Label>
                            <div className="relative mt-1.5">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="min-h-11 pl-9"
                                    placeholder="Nama, telepon, model, sumber"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="stage">Tahap</Label>
                            <select
                                id="stage"
                                value={stage}
                                onChange={(event) =>
                                    setStage(event.target.value)
                                }
                                className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
                            >
                                <option value="">Semua tahap</option>
                                {stages.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {assignableSales.length > 0 && (
                            <div>
                                <Label htmlFor="sales">Sales</Label>
                                <div className="mt-1.5">
                                    <Combobox
                                        id="sales"
                                        value={salesId}
                                        onValueChange={setSalesId}
                                        options={[
                                            {
                                                value: '',
                                                label: 'Semua sales',
                                            },
                                            ...assignableSales.map((user) => ({
                                                value: String(user.id),
                                                label: user.name,
                                            })),
                                        ]}
                                        placeholder="Semua sales"
                                        searchPlaceholder="Cari sales..."
                                        aria-label="Sales"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="transaction-date-from">
                                Lead dibuat mulai
                            </Label>
                            <Input
                                id="transaction-date-from"
                                type="date"
                                className="mt-1.5"
                                value={dateFrom}
                                onChange={(event) =>
                                    setDateFrom(event.target.value)
                                }
                                aria-invalid={!!errors?.date_from}
                                aria-describedby={
                                    errors?.date_from
                                        ? 'transaction-date-from-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="transaction-date-from-error"
                                message={errors?.date_from}
                            />
                        </div>
                        <div>
                            <Label htmlFor="transaction-date-to">
                                Lead dibuat sampai
                            </Label>
                            <Input
                                id="transaction-date-to"
                                type="date"
                                className="mt-1.5"
                                value={dateTo}
                                onChange={(event) =>
                                    setDateTo(event.target.value)
                                }
                                aria-invalid={!!errors?.date_to}
                                aria-describedby={
                                    errors?.date_to
                                        ? 'transaction-date-to-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="transaction-date-to-error"
                                message={errors?.date_to}
                            />
                        </div>
                        <div>
                            <Label htmlFor="transaction-source">
                                Sumber lead
                            </Label>
                            <select
                                id="transaction-source"
                                className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
                                value={source}
                                onChange={(event) =>
                                    setSource(event.target.value)
                                }
                            >
                                <option value="">Semua sumber</option>
                                {[
                                    ...new Set([
                                        ...sourceOptions,
                                        ...(source ? [source] : []),
                                    ]),
                                ].map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors?.source} />
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={() => applyFilters()}
                                className="min-h-11 w-full"
                            >
                                Terapkan
                            </Button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <Button
                                key={tab.value}
                                variant={
                                    filters.tab === tab.value
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                className="min-h-10"
                                onClick={() => applyFilters(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </FilterPanel>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Daftar transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactions.data.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Tidak ada transaksi sesuai filter.
                            </p>
                        ) : (
                            <>
                                <div className="space-y-3 md:hidden">
                                    {transactions.data.map((transaction) => (
                                        <div
                                            key={transaction.id}
                                            className="striped-row rounded-lg border p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {transaction.customer
                                                            ?.name ?? '-'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            transaction.vehicle_model
                                                        }{' '}
                                                        ·{' '}
                                                        {transaction.sales
                                                            ?.name ?? '-'}
                                                    </p>
                                                </div>
                                                <StageBadge
                                                    stage={
                                                        transaction.current_stage
                                                    }
                                                >
                                                    {transaction.stage_label}
                                                </StageBadge>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Sumber
                                                    </p>
                                                    <p>{transaction.source}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Estimasi
                                                    </p>
                                                    <p>
                                                        {transaction.estimated_value?.toLocaleString(
                                                            'id-ID',
                                                        ) ?? '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            {transaction.can_update && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3 min-h-10 w-full"
                                                    onClick={() =>
                                                        openUpdate(transaction)
                                                    }
                                                >
                                                    Ubah tahap
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full min-w-[900px] text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="p-2">
                                                    Pelanggan
                                                </th>
                                                <th className="p-2">Model</th>
                                                <th className="p-2">Sales</th>
                                                <th className="p-2">Tahap</th>
                                                <th className="p-2">Sumber</th>
                                                <th className="p-2">
                                                    Estimasi
                                                </th>
                                                <th className="p-2">
                                                    Aktivitas terakhir
                                                </th>
                                                <th className="p-2">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.data.map(
                                                (transaction) => (
                                                    <tr
                                                        key={transaction.id}
                                                        className="striped-row border-b"
                                                    >
                                                        <td className="p-2">
                                                            <p className="font-medium">
                                                                {transaction
                                                                    .customer
                                                                    ?.name ??
                                                                    '-'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    transaction
                                                                        .customer
                                                                        ?.phone
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="p-2">
                                                            {
                                                                transaction.vehicle_model
                                                            }
                                                        </td>
                                                        <td className="p-2">
                                                            {transaction.sales
                                                                ?.name ?? '-'}
                                                        </td>
                                                        <td className="p-2">
                                                            <StageBadge
                                                                stage={
                                                                    transaction.current_stage
                                                                }
                                                            >
                                                                {
                                                                    transaction.stage_label
                                                                }
                                                            </StageBadge>
                                                        </td>
                                                        <td className="p-2">
                                                            {transaction.source}
                                                        </td>
                                                        <td className="p-2">
                                                            {transaction.estimated_value?.toLocaleString(
                                                                'id-ID',
                                                            ) ?? '-'}
                                                        </td>
                                                        <td className="p-2">
                                                            {transaction.last_activity_at
                                                                ? new Date(
                                                                      transaction.last_activity_at,
                                                                  ).toLocaleString(
                                                                      'id-ID',
                                                                  )
                                                                : '-'}
                                                        </td>
                                                        <td className="table-actions p-2">
                                                            {transaction.can_update && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="min-h-9"
                                                                    onClick={() =>
                                                                        openUpdate(
                                                                            transaction,
                                                                        )
                                                                    }
                                                                >
                                                                    Ubah
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                            {transactions.links.map((link, index) => (
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
                    </CardContent>
                </Card>

                {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-5 shadow-xl">
                            <h2 className="text-lg font-semibold">
                                Ubah tahap transaksi
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {selected.customer?.name} ·{' '}
                                {selected.vehicle_model}
                            </p>
                            <div className="mt-4">
                                <ClosingMonthForm
                                    key={selected.public_id}
                                    transactionId={selected.public_id}
                                    month={
                                        selected.expected_closing_month ?? null
                                    }
                                />
                            </div>
                            <form
                                onSubmit={submitUpdate}
                                className="mt-4 space-y-4"
                            >
                                <div>
                                    <Label htmlFor="to_stage">Tahap baru</Label>
                                    <select
                                        id="to_stage"
                                        value={toStage}
                                        onChange={(event) =>
                                            setToStage(event.target.value)
                                        }
                                        className="native-select mt-2 min-h-11 w-full rounded-md border bg-background px-3"
                                    >
                                        {stages.map((item) => (
                                            <option
                                                key={item.value}
                                                value={item.value}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="notes">Catatan</Label>
                                    <Input
                                        id="notes"
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                        className="mt-2 min-h-11"
                                    />
                                </div>
                                {toStage === 'spk' && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={bookingFee}
                                            onChange={(event) =>
                                                setBookingFee(
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Konfirmasi booking fee
                                    </label>
                                )}
                                {toStage === 'lost' && (
                                    <>
                                        <div>
                                            <Label htmlFor="lost_reason">
                                                Alasan lost
                                            </Label>
                                            <select
                                                id="lost_reason"
                                                value={lostReason}
                                                onChange={(event) =>
                                                    setLostReason(
                                                        event.target.value,
                                                    )
                                                }
                                                className="native-select mt-2 min-h-11 w-full rounded-md border bg-background px-3"
                                            >
                                                <option value="">
                                                    Pilih alasan
                                                </option>
                                                {lostReasons.map((item) => (
                                                    <option
                                                        key={item.value}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label htmlFor="lost_notes">
                                                Catatan lost
                                            </Label>
                                            <Input
                                                id="lost_notes"
                                                value={lostNotes}
                                                onChange={(event) =>
                                                    setLostNotes(
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 min-h-11"
                                            />
                                        </div>
                                    </>
                                )}
                                {errors && Object.keys(errors).length > 0 && (
                                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                        {Object.values(errors).join(' ')}
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelected(null)}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" className="min-h-11">
                                        Simpan
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
