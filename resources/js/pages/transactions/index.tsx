import InputError from '@/components/input-error';
import { Head, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, RefreshCw, Search, Truck, Undo2 } from 'lucide-react';
import { FilterPanel } from '@/components/filter-panel';
import { useEffect, useRef, useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangeField } from '@/components/date-range-field';
import type { CustomerProfile } from '@/lib/customer-profile';
import {
    type Area,
    CHANNEL_LABELS,
    areaLabel,
    formatDate,
    sourceLabel,
    supervisorLabel,
} from '@/lib/transaction-labels';
import type { VehicleOption } from '@/components/transaction-fields';
import type { StageAction } from '@/components/transaction-detail/stage-form';
import { TransactionDetailModal } from '@/components/transaction-detail/transaction-detail-modal';

type Transaction = {
    id: number;
    public_id: string;
    customer: { name: string; phone: string } | null;
    customer_profile: CustomerProfile | null;
    sales: { name: string; username: string } | null;
    vehicle_model: string | null;
    source: string;
    source_channel: string | null;
    notes: string | null;
    progress_at: string | null;
    supervisors: { id: number; name: string }[];
    area: Area;
    financing: {
        type: string | null;
        leasing_id: number | null;
        other_name: string | null;
        leasing_name?: string | null;
    };
    current_stage: string;
    stage_label: string;
    estimated_value: number | null;
    expected_closing_month: string | null;
    is_stagnant: boolean;
    last_activity_at: string | null;
    created_at: string;
    can_update: boolean;
    can_record_do: boolean;
    can_confirm_delivery: boolean;
    can_cancel_do: boolean;
    do_event_id: number | null;
    stage_event_id: number | null;
};

type Paginated<T> = {
    data: T[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type SalesUser = { id: number; name: string; username: string };
type FilterQuery = Record<
    | 'search'
    | 'stage'
    | 'tab'
    | 'sales_id'
    | 'date_from'
    | 'date_to'
    | 'source'
    | 'customer_name'
    | 'supervisor_id'
    | 'region_code'
    | 'district_code'
    | 'source_channel',
    string | null
>;

type Props = {
    vehicleOptions?: VehicleOption[];
    transactions: Paginated<Transaction>;
    filters: {
        search: string;
        stage: string;
        tab: string;
        sales_id: number | null;
        date_from?: string | null;
        date_to?: string | null;
        source?: string | null;
        customer_name?: string | null;
        supervisor_id?: number | null;
        region_code?: string | null;
        district_code?: string | null;
        source_channel?: string | null;
    };
    sourceOptions?: string[];
    supervisorOptions?: { id: number; name: string }[];
    supervisorLocked?: boolean;
    regions?: { code: string; name: string }[];
    districts?: { code: string; region_code: string; name: string }[];
    leasings?: { id: number; name: string }[];
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
    supervisorOptions = [],
    supervisorLocked = false,
    regions = [],
    districts = [],
    leasings = [],
    vehicleOptions = [],
}: Props) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [search, setSearch] = useState(filters.search);
    const [stage, setStage] = useState(filters.stage);
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [source, setSource] = useState(filters.source ?? '');
    // Back/Forward changes the applied filters while the page state is preserved; follow them.
    useEffect(() => {
        setSearch(filters.search);
        setStage(filters.stage);
        setDateFrom(filters.date_from ?? '');
        setDateTo(filters.date_to ?? '');
        setSource(filters.source ?? '');
        setSalesId(filters.sales_id ? String(filters.sales_id) : '');
        setCustomerName(filters.customer_name ?? '');
        setSupervisorId(
            filters.supervisor_id ? String(filters.supervisor_id) : '',
        );
        setRegionCode(filters.region_code ?? '');
        setDistrictCode(filters.district_code ?? '');
        setSourceChannel(filters.source_channel ?? '');
        // Keyed on the content, so paging or Refresh with the same filters keeps an unapplied draft.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(filters)]);
    const [customerName, setCustomerName] = useState(
        filters.customer_name ?? '',
    );
    const [supervisorId, setSupervisorId] = useState(
        filters.supervisor_id ? String(filters.supervisor_id) : '',
    );
    const [regionCode, setRegionCode] = useState(filters.region_code ?? '');
    const [districtCode, setDistrictCode] = useState(
        filters.district_code ?? '',
    );
    const [sourceChannel, setSourceChannel] = useState(
        filters.source_channel ?? '',
    );
    const [detailTarget, setDetailTarget] = useState<Transaction | null>(null);
    const [salesId, setSalesId] = useState(
        filters.sales_id ? String(filters.sales_id) : '',
    );
    const [detailIntent, setDetailIntent] = useState<{
        action: StageAction;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [failedVisit, setFailedVisit] = useState<{
        target: FilterQuery | string;
        message: string;
    } | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const actionTriggerRef = useRef<HTMLButtonElement>(null);
    const draft = {
        search,
        stage,
        sales_id: salesId || null,
        // Empty strings (not null) keep "no date limit" distinct from the server's month default.
        date_from: dateFrom,
        date_to: dateTo,
        source: source || null,
        customer_name: customerName || null,
        supervisor_id: supervisorLocked ? null : supervisorId || null,
        region_code: regionCode || null,
        district_code: regionCode ? districtCode || null : null,
        source_channel: source === 'digital_ad' ? sourceChannel || null : null,
    };
    const failedQuery =
        typeof failedVisit?.target === 'string' ? null : failedVisit?.target;
    const draftChanged =
        failedQuery &&
        (Object.keys(draft) as (keyof typeof draft)[]).some(
            (key) => (draft[key] ?? '') !== (failedQuery[key] ?? ''),
        );

    const visitTransactions = (target: FilterQuery | string, retry = false) => {
        const pagination = typeof target === 'string';
        router.get(
            pagination ? target : '/transactions',
            pagination ? {} : target,
            {
                preserveState: true,
                replace: !pagination,
                onStart: () => {
                    setIsLoading(true);
                    if (!retry) setFailedVisit(null);
                },
                onFinish: () => setIsLoading(false),
                onSuccess: () => {
                    setFailedVisit(null);
                    if (retry) headingRef.current?.focus();
                },
                onError: () => setFailedVisit(null),
                onNetworkError: () => {
                    setFailedVisit({
                        target,
                        message: 'Koneksi terputus saat memuat transaksi.',
                    });
                    return false;
                },
                onHttpException: (response) => {
                    if (response.status < 500) return;
                    setFailedVisit({
                        target,
                        message: 'Daftar transaksi belum dapat dimuat.',
                    });
                    return false;
                },
            },
        );
    };

    const applyFilters = (nextTab = filters.tab) =>
        visitTransactions({ ...draft, tab: nextTab });

    const iconButton = (
        label: string,
        tone: string,
        icon: React.ReactNode,
        onClick: (button: HTMLButtonElement) => void,
    ) => (
        <Button
            key={label}
            type="button"
            variant="outline"
            size="icon"
            title={label}
            aria-label={label}
            className={`size-11 ${tone}`}
            onClick={(event) => onClick(event.currentTarget)}
        >
            {icon}
        </Button>
    );

    const renderActions = (transaction: Transaction) => {
        const open = (action: StageAction) => (button: HTMLButtonElement) => {
            actionTriggerRef.current = button;
            openDetail(transaction, { action });
        };

        return (
            <>
                {iconButton(
                    'Detail',
                    'text-blue-600',
                    <Eye className="size-4" />,
                    (button) => {
                        actionTriggerRef.current = button;
                        openDetail(transaction);
                    },
                )}
                {transaction.can_update &&
                    iconButton(
                        'Ubah tahap',
                        'text-amber-600',
                        <Pencil className="size-4" />,
                        open(null),
                    )}
                {transaction.can_confirm_delivery &&
                    iconButton(
                        'Konfirmasi Delivery',
                        'text-green-600',
                        <Truck className="size-4" />,
                        open('delivery'),
                    )}
                {transaction.can_cancel_do &&
                    iconButton(
                        'Batalkan DO',
                        'text-red-600',
                        <Undo2 className="size-4" />,
                        open('cancel'),
                    )}
            </>
        );
    };

    const openDetail = (
        transaction: Transaction,
        intent: { action: StageAction } | null = null,
    ) => {
        setDetailIntent(intent);
        setDetailTarget(transaction);
    };

    const resetFilters = () => {
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Asia/Jakarta',
        });
        const next = { date_from: `${today.slice(0, 8)}01`, date_to: today };
        setSearch('');
        setStage('');
        setSalesId('');
        setSource('');
        setCustomerName('');
        setSupervisorId('');
        setRegionCode('');
        setDistrictCode('');
        setSourceChannel('');
        setDateFrom(next.date_from);
        setDateTo(next.date_to);
        visitTransactions({
            search: '',
            stage: '',
            tab: 'all',
            sales_id: null,
            source: null,
            customer_name: null,
            supervisor_id: null,
            region_code: null,
            district_code: null,
            source_channel: null,
            ...next,
        });
    };

    const refresh = () =>
        router.reload({
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });

    return (
        <>
            <Head title="Transaksi" />
            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1
                            ref={headingRef}
                            tabIndex={-1}
                            className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
                        >
                            Transaksi
                        </h1>
                        <p className="mt-2 max-w-prose text-muted-foreground">
                            Pantau pipeline, filter transaksi, dan perbarui
                            tahap dari satu halaman.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            disabled={isLoading}
                            onClick={refresh}
                        >
                            <RefreshCw className="size-4" /> Refresh
                        </Button>
                        <Button asChild variant="outline" className="min-h-11">
                            <a
                                href={`/transactions/export.csv${typeof window === 'undefined' ? '' : window.location.search}`}
                            >
                                Ekspor CSV
                            </a>
                        </Button>
                        <Button asChild className="min-h-11">
                            <a href="/transactions/create">Tambah transaksi</a>
                        </Button>
                    </div>
                </div>

                <FilterPanel
                    className="mt-6"
                    title="Filter transaksi"
                    summary={`${[filters.search, filters.stage, filters.sales_id, filters.date_from, filters.date_to, filters.source, filters.customer_name, filters.supervisor_id, filters.region_code, filters.district_code, filters.source_channel, filters.tab !== 'all' ? filters.tab : null].filter(Boolean).length} filter aktif`}
                >
                    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
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
                        <DateRangeField
                            id="transaction-date"
                            label="Rentang progress"
                            className="sm:col-span-2"
                            from={dateFrom}
                            to={dateTo}
                            onChange={(from, to) => {
                                setDateFrom(from);
                                setDateTo(to);
                            }}
                            errorFrom={errors?.date_from}
                            errorTo={errors?.date_to}
                        />
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
                        {supervisorOptions.length > 0 && (
                            <div>
                                <Label htmlFor="supervisor">Supervisor</Label>
                                <select
                                    id="supervisor"
                                    value={
                                        supervisorLocked
                                            ? String(supervisorOptions[0].id)
                                            : supervisorId
                                    }
                                    disabled={supervisorLocked}
                                    onChange={(event) =>
                                        setSupervisorId(event.target.value)
                                    }
                                    className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {!supervisorLocked && (
                                        <option value="">
                                            Semua supervisor
                                        </option>
                                    )}
                                    {supervisorOptions.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                        <div>
                            <Label htmlFor="source-channel">
                                Kanal digital
                            </Label>
                            <select
                                id="source-channel"
                                value={
                                    source === 'digital_ad' ? sourceChannel : ''
                                }
                                disabled={source !== 'digital_ad'}
                                onChange={(event) =>
                                    setSourceChannel(event.target.value)
                                }
                                className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Semua kanal</option>
                                {Object.entries(CHANNEL_LABELS).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="region">Kabupaten/Kota</Label>
                            <div className="mt-1.5">
                                <Combobox
                                    id="region"
                                    value={regionCode}
                                    onValueChange={(value) => {
                                        setRegionCode(value);
                                        setDistrictCode('');
                                    }}
                                    options={[
                                        {
                                            value: '',
                                            label: 'Semua kabupaten/kota',
                                        },
                                        ...regions.map((item) => ({
                                            value: item.code,
                                            label: item.name,
                                        })),
                                    ]}
                                    placeholder="Semua kabupaten/kota"
                                    searchPlaceholder="Cari kabupaten/kota..."
                                    aria-label="Kabupaten/Kota"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="district">Kecamatan</Label>
                            <div className="mt-1.5">
                                <Combobox
                                    id="district"
                                    value={districtCode}
                                    onValueChange={setDistrictCode}
                                    disabled={regionCode === ''}
                                    options={[
                                        { value: '', label: 'Semua kecamatan' },
                                        ...districts
                                            .filter(
                                                (item) =>
                                                    item.region_code ===
                                                    regionCode,
                                            )
                                            .map((item) => ({
                                                value: item.code,
                                                label: item.name,
                                            })),
                                    ]}
                                    placeholder="Semua kecamatan"
                                    searchPlaceholder="Cari kecamatan..."
                                    aria-label="Kecamatan"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="customer-name">
                                Nama pelanggan
                            </Label>
                            <Input
                                id="customer-name"
                                value={customerName}
                                onChange={(event) =>
                                    setCustomerName(event.target.value)
                                }
                                className="mt-1.5 min-h-11"
                            />
                            <InputError message={errors?.customer_name} />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
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
                                    disabled={isLoading}
                                    onClick={() => applyFilters(tab.value)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLoading}
                                onClick={resetFilters}
                                className="min-h-11"
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={() => applyFilters()}
                                disabled={isLoading}
                                className="min-h-11 w-full"
                            >
                                Terapkan
                            </Button>
                        </div>
                    </div>
                </FilterPanel>

                <p
                    role="status"
                    className={
                        isLoading
                            ? 'mt-3 text-sm text-muted-foreground'
                            : 'sr-only'
                    }
                >
                    {isLoading ? 'Memuat transaksi…' : ''}
                </p>
                {failedVisit && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3">
                        <p role="alert" className="text-sm">
                            {failedVisit.message} Daftar masih menampilkan data
                            terakhir yang berhasil dimuat.
                            {draftChanged &&
                                ' Terapkan filter yang telah diubah.'}
                        </p>
                        {!draftChanged && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() =>
                                    visitTransactions(failedVisit.target, true)
                                }
                            >
                                Coba lagi
                            </Button>
                        )}
                    </div>
                )}

                <Card className="mt-6" aria-busy={isLoading}>
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
                                                        {transaction.vehicle_model ??
                                                            'Belum dipilih'}{' '}
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
                                                        Progress
                                                    </p>
                                                    <p>
                                                        {formatDate(
                                                            transaction.progress_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Sumber
                                                    </p>
                                                    <p>
                                                        {sourceLabel(
                                                            transaction,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Kecamatan
                                                    </p>
                                                    <p>
                                                        {areaLabel(transaction)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Supervisor
                                                    </p>
                                                    <p>
                                                        {supervisorLabel(
                                                            transaction,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {renderActions(transaction)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full min-w-[1100px] text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="p-2">
                                                    Tanggal Progress
                                                </th>
                                                <th className="p-2">
                                                    Pelanggan
                                                </th>
                                                <th className="p-2">
                                                    Unit yang diminati
                                                </th>
                                                <th className="p-2">Tahap</th>
                                                <th className="p-2">Sumber</th>
                                                <th className="p-2">
                                                    Kecamatan
                                                </th>
                                                <th className="p-2">
                                                    Sales / Supervisor
                                                </th>
                                                <th className="p-2">
                                                    Aktivitas terakhir
                                                </th>
                                                <th className="p-2">
                                                    Keterangan
                                                </th>
                                                <th className="p-2">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.data.map(
                                                (transaction) => (
                                                    <tr
                                                        key={transaction.id}
                                                        className="striped-row border-b align-top"
                                                    >
                                                        <td className="p-2 whitespace-nowrap">
                                                            <span
                                                                tabIndex={0}
                                                                title={`Dibuat ${formatDate(transaction.created_at)}`}
                                                                aria-label={`Progress ${formatDate(transaction.progress_at)}, dibuat ${formatDate(transaction.created_at)}`}
                                                            >
                                                                {formatDate(
                                                                    transaction.progress_at,
                                                                )}
                                                            </span>
                                                        </td>
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
                                                            {transaction.vehicle_model ??
                                                                'Belum dipilih'}
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
                                                            {sourceLabel(
                                                                transaction,
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            {areaLabel(
                                                                transaction,
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            <p>
                                                                {transaction
                                                                    .sales
                                                                    ?.name ??
                                                                    '-'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {supervisorLabel(
                                                                    transaction,
                                                                )}
                                                            </p>
                                                        </td>
                                                        <td className="p-2">
                                                            {transaction.last_activity_at
                                                                ? new Date(
                                                                      transaction.last_activity_at,
                                                                  ).toLocaleString(
                                                                      'id-ID',
                                                                      {
                                                                          timeZone:
                                                                              'Asia/Jakarta',
                                                                      },
                                                                  )
                                                                : '-'}
                                                        </td>
                                                        <td className="max-w-48 p-2 break-words">
                                                            {transaction.notes ??
                                                                '-'}
                                                        </td>
                                                        <td className="table-actions p-2">
                                                            <div className="flex gap-1">
                                                                {renderActions(
                                                                    transaction,
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <p className="mt-4 text-sm text-muted-foreground">
                            {transactions.total > 0
                                ? `Menampilkan ${transactions.from}–${transactions.to} dari ${transactions.total} transaksi`
                                : 'Tidak ada hasil'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {transactions.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={
                                        link.active ? 'default' : 'outline'
                                    }
                                    size="sm"
                                    disabled={!link.url || isLoading}
                                    className="min-h-9"
                                    onClick={() =>
                                        link.url && visitTransactions(link.url)
                                    }
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <TransactionDetailModal
                    // Reopening with another intent (Detail, then Ubah tahap) must start the view over.
                    key={`${detailTarget?.public_id}-${detailIntent?.action ?? 'detail'}-${detailIntent ? 'stage' : ''}`}
                    target={detailTarget}
                    intent={detailIntent}
                    onClose={() => setDetailTarget(null)}
                    regions={regions ?? []}
                    districts={districts ?? []}
                    leasings={leasings ?? []}
                    stages={stages}
                    lostReasons={lostReasons}
                    vehicleOptions={vehicleOptions}
                    assignableSales={assignableSales}
                />
            </div>
        </>
    );
}
