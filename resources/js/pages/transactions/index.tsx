import { ClosingMonthForm } from '@/components/team-performance';
import { DoChecklist, emptyDoChecklist } from '@/components/do-checklist';
import InputError from '@/components/input-error';
import { Head, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, RefreshCw, Search, Truck, Undo2 } from 'lucide-react';
import { FilterPanel } from '@/components/filter-panel';
import { useRef, useState } from 'react';
import { StageBadge } from '@/components/stage-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AreaFields,
    AreaFinancing,
    Field,
    FinancingFields,
    areaPayload,
    financingPayload,
} from '@/components/transaction-fields';

type Transaction = {
    id: number;
    public_id: string;
    customer: { name: string; phone: string } | null;
    sales: { name: string; username: string } | null;
    vehicle_model: string;
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
    regions?: { code: string; name: string }[];
    districts?: { code: string; region_code: string; name: string }[];
    leasings?: { id: number; name: string }[];
    assignableSales: SalesUser[];
    stages: Array<{ value: string; label: string }>;
    lostReasons: Array<{ value: string; label: string }>;
};

const CHANNEL_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Website',
    other: 'Lainnya',
};

type Area = {
    region_code: string | null;
    district_code: string | null;
    region_name: string | null;
    district_name: string | null;
    other_city: string | null;
};
type RowDetail = Pick<
    Transaction,
    'source' | 'source_channel' | 'area' | 'financing' | 'supervisors'
>;

const formatDate = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : '-';
const sourceLabel = (t: RowDetail) =>
    t.source_channel
        ? `${t.source} · ${CHANNEL_LABELS[t.source_channel] ?? t.source_channel}`
        : t.source;
const areaLabel = (t: { area: Area }, full = false) => {
    const {
        district_name: district,
        region_name: region,
        other_city: city,
    } = t.area;
    if (city) return city;
    if (!district) return '-';
    // Names repeat across regions (e.g. Cisarua), so the parent is always shown in full mode.
    return full && region ? `${district}, ${region}` : district;
};
const supervisorLabel = (t: RowDetail) =>
    t.supervisors.map((user) => user.name).join(', ') || '-';
const financingLabel = (t: RowDetail) =>
    t.financing.type === 'cash'
        ? 'Cash'
        : t.financing.type === 'credit'
          ? `Kredit${t.financing.other_name ? ` · ${t.financing.other_name}` : ''}`
          : 'Belum ditentukan';

type Detail = Transaction & {
    can_edit_metadata: boolean;
    customer: {
        name: string;
        phone: string;
        social_media_account: string | null;
    };
    history: {
        data: {
            key: string;
            occurred_at: string;
            label: string;
            body: string | null;
        }[];
        last_page: number;
        total: number;
    } | null;
};

const initialAreaFinancing = (d: Detail): AreaFinancing => ({
    region: d.area.other_city ? 'other' : (d.area.region_code ?? ''),
    district: d.area.district_code ?? '',
    city: d.area.other_city ?? '',
    financing: d.financing.type ?? '',
    leasing: d.financing.other_name
        ? 'other'
        : d.financing.leasing_id
          ? String(d.financing.leasing_id)
          : '',
    otherLeasing: d.financing.other_name ?? '',
});

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
    regions = [],
    districts = [],
    leasings = [],
}: Props) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [search, setSearch] = useState(filters.search);
    const [stage, setStage] = useState(filters.stage);
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [source, setSource] = useState(filters.source ?? '');
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
    const [edit, setEdit] = useState<{
        value: AreaFinancing;
        notes: string;
        saving: boolean;
    } | null>(null);
    const [detailTarget, setDetailTarget] = useState<Transaction | null>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [detailState, setDetailState] = useState<
        'idle' | 'loading' | 'error'
    >('idle');
    const [salesId, setSalesId] = useState(
        filters.sales_id ? String(filters.sales_id) : '',
    );
    const [selected, setSelected] = useState<Transaction | null>(null);
    const [fulfillmentAction, setFulfillmentAction] = useState<
        'delivery' | 'cancel' | null
    >(null);
    const [toStage, setToStage] = useState('');
    const [notes, setNotes] = useState('');
    const [bookingFee, setBookingFee] = useState(false);
    const [doChecklist, setDoChecklist] = useState(emptyDoChecklist);
    const [lostReason, setLostReason] = useState('');
    const [lostNotes, setLostNotes] = useState('');
    const [isSavingStage, setIsSavingStage] = useState(false);
    const [stageNetworkError, setStageNetworkError] = useState(false);
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
        supervisor_id: supervisorId || null,
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

    const openUpdate = (
        transaction: Transaction,
        action: typeof fulfillmentAction,
    ) => {
        setSelected(transaction);
        setFulfillmentAction(action);
        setToStage(transaction.current_stage);
        setNotes('');
        setBookingFee(false);
        setDoChecklist(emptyDoChecklist);
        setLostReason('');
        setLostNotes('');
        setStageNetworkError(false);
    };

    const submitUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected || isSavingStage) return;
        const options = {
            onStart: () => {
                setStageNetworkError(false);
                setIsSavingStage(true);
            },
            onFinish: () => setIsSavingStage(false),
            onNetworkError: () => {
                setStageNetworkError(true);
                return false;
            },
            onSuccess: () => setSelected(null),
        };
        const url = `/transactions/${selected.public_id}`;
        if (fulfillmentAction === 'cancel') {
            router.post(
                `${url}/cancel-do`,
                { reason: notes.trim(), do_event_id: selected.do_event_id },
                options,
            );
            return;
        }
        router.patch(
            `${url}/stage`,
            {
                to_stage: fulfillmentAction ?? toStage,
                do_event_id: selected.do_event_id,
                stage_event_id: selected.stage_event_id,
                notes: notes || null,
                booking_fee_confirmed: bookingFee,
                ...doChecklist,
                lost_reason: lostReason || null,
                lost_notes: lostNotes || null,
            },
            options,
        );
    };

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
        const open =
            (action: typeof fulfillmentAction) =>
            (button: HTMLButtonElement) => {
                actionTriggerRef.current = button;
                openUpdate(transaction, action);
            };

        return (
            <>
                {iconButton(
                    'Detail',
                    'text-blue-600',
                    <Eye className="size-4" />,
                    (button) => {
                        actionTriggerRef.current = button;
                        void openDetail(transaction);
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

    const openDetail = async (transaction: Transaction) => {
        setDetailTarget(transaction);
        setEdit(null);
        setDetail(null);
        setDetailState('loading');
        try {
            const response = await fetch(
                `/transactions/${transaction.public_id}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );
            if (!response.ok) throw new Error('detail');
            setDetail(await response.json());
            setDetailState('idle');
        } catch {
            setDetailState('error');
        }
    };

    const startEdit = (d: Detail) =>
        setEdit({
            value: initialAreaFinancing(d),
            notes: d.notes ?? '',
            saving: false,
        });

    const saveEdit = () => {
        if (!edit || !detail || edit.saving) return;
        const initial = initialAreaFinancing(detail);
        const same = (a: unknown, b: unknown) =>
            JSON.stringify(a) === JSON.stringify(b);
        // Only changed parts are sent, so an untouched legacy (inactive) leasing is never revalidated.
        const payload: NonNullable<Parameters<typeof router.patch>[1]> = {
            notes: edit.notes || null,
        };
        if (!same(areaPayload(edit.value), areaPayload(initial)))
            payload.area = areaPayload(edit.value);
        if (!same(financingPayload(edit.value), financingPayload(initial)))
            payload.financing = financingPayload(edit.value);
        router.patch(`/transactions/${detail.public_id}`, payload, {
            preserveScroll: true,
            preserveState: true,
            onStart: () =>
                setEdit((current) => current && { ...current, saving: true }),
            onSuccess: () => {
                setEdit(null);
                if (detailTarget) void openDetail(detailTarget);
            },
            onFinish: () =>
                setEdit((current) => current && { ...current, saving: false }),
        });
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

    const fulfillmentTitle =
        fulfillmentAction === 'delivery'
            ? 'Konfirmasi Delivery'
            : 'Batalkan DO';

    return (
        <>
            <Head title="Transaksi" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
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
                                Progress mulai
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
                                Progress sampai
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
                        {supervisorOptions.length > 0 && (
                            <div>
                                <Label htmlFor="supervisor">Supervisor</Label>
                                <select
                                    id="supervisor"
                                    value={supervisorId}
                                    onChange={(event) =>
                                        setSupervisorId(event.target.value)
                                    }
                                    className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
                                >
                                    <option value="">Semua supervisor</option>
                                    {supervisorOptions.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="region">Kabupaten/Kota</Label>
                            <select
                                id="region"
                                value={regionCode}
                                onChange={(event) => {
                                    setRegionCode(event.target.value);
                                    setDistrictCode('');
                                }}
                                className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
                            >
                                <option value="">Semua kabupaten/kota</option>
                                {regions.map((item) => (
                                    <option key={item.code} value={item.code}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="district">Kecamatan</Label>
                            <select
                                id="district"
                                value={districtCode}
                                disabled={regionCode === ''}
                                onChange={(event) =>
                                    setDistrictCode(event.target.value)
                                }
                                className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
                            >
                                <option value="">Semua kecamatan</option>
                                {districts
                                    .filter(
                                        (item) =>
                                            item.region_code === regionCode,
                                    )
                                    .map((item) => (
                                        <option
                                            key={item.code}
                                            value={item.code}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        {source === 'digital_ad' && (
                            <div>
                                <Label htmlFor="source-channel">
                                    Kanal digital
                                </Label>
                                <select
                                    id="source-channel"
                                    value={sourceChannel}
                                    onChange={(event) =>
                                        setSourceChannel(event.target.value)
                                    }
                                    className="native-select mt-1.5 min-h-11 w-full rounded-md border bg-background px-3"
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
                        )}
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
                                disabled={isLoading}
                                onClick={() => applyFilters(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
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
                                                            {
                                                                transaction.vehicle_model
                                                            }
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

                {selected && !fulfillmentAction && (
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
                                        {stages
                                            .filter(
                                                (item) =>
                                                    item.value !== 'delivery' &&
                                                    (item.value !== 'do' ||
                                                        selected.can_record_do),
                                            )
                                            .map((item) => (
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
                                {toStage === 'do' && (
                                    <DoChecklist
                                        value={doChecklist}
                                        onChange={setDoChecklist}
                                    />
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
                                {stageNetworkError ? (
                                    <div
                                        role="alert"
                                        className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                                    >
                                        Koneksi terputus saat menyimpan tahap.
                                        Draft tetap tersedia. Periksa koneksi
                                        dan status transaksi sebelum mencoba
                                        lagi.
                                    </div>
                                ) : (
                                    errors &&
                                    Object.keys(errors).length > 0 && (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                            {Object.values(errors).join(' ')}
                                        </div>
                                    )
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSavingStage}
                                        onClick={() => setSelected(null)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="min-h-11"
                                        disabled={
                                            isSavingStage ||
                                            (toStage === 'do' &&
                                                !Object.values(
                                                    doChecklist,
                                                ).every(Boolean))
                                        }
                                    >
                                        {isSavingStage
                                            ? 'Menyimpan…'
                                            : 'Simpan'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <Dialog
                    open={Boolean(selected && fulfillmentAction)}
                    onOpenChange={(open) => {
                        if (!open && !isSavingStage) setSelected(null);
                    }}
                >
                    <DialogContent
                        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (actionTriggerRef.current?.isConnected) {
                                actionTriggerRef.current.focus();
                            } else {
                                headingRef.current?.focus();
                            }
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{fulfillmentTitle}</DialogTitle>
                            <DialogDescription>
                                {selected?.vehicle_model}.{' '}
                                {fulfillmentAction === 'delivery'
                                    ? 'Konfirmasi bahwa kendaraan sudah terkirim.'
                                    : 'Transaksi akan kembali ke SPK dan DO ini dikeluarkan dari realisasi.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitUpdate} className="space-y-4">
                            {fulfillmentAction === 'cancel' && (
                                <div className="space-y-1">
                                    <Label htmlFor="cancel-do-reason">
                                        Alasan pembatalan
                                    </Label>
                                    <Input
                                        id="cancel-do-reason"
                                        required
                                        maxLength={2000}
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                    />
                                </div>
                            )}
                            {stageNetworkError ? (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    Koneksi terputus. Periksa status transaksi
                                    sebelum mencoba lagi.
                                </p>
                            ) : (
                                errors &&
                                Object.keys(errors).length > 0 && (
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {Object.values(errors).join(' ')}
                                    </p>
                                )
                            )}
                            <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSavingStage}
                                    onClick={() => setSelected(null)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant={
                                        fulfillmentAction === 'cancel'
                                            ? 'destructive'
                                            : 'default'
                                    }
                                    disabled={
                                        isSavingStage ||
                                        (fulfillmentAction === 'cancel' &&
                                            !notes.trim())
                                    }
                                >
                                    {isSavingStage
                                        ? 'Menyimpan…'
                                        : fulfillmentTitle}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={detailTarget !== null}
                    onOpenChange={(open) => {
                        if (!open) setDetailTarget(null);
                    }}
                >
                    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Detail transaksi</DialogTitle>
                            <DialogDescription>
                                {detailTarget?.customer?.name} ·{' '}
                                {detailTarget?.vehicle_model}
                            </DialogDescription>
                        </DialogHeader>
                        {detailState === 'loading' && (
                            <p role="status" className="text-sm">
                                Memuat detail…
                            </p>
                        )}
                        {detailState === 'error' && (
                            <p role="alert" className="text-sm">
                                Detail belum dapat dimuat.{' '}
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={() =>
                                        detailTarget && openDetail(detailTarget)
                                    }
                                >
                                    Coba lagi
                                </button>
                            </p>
                        )}
                        {detail && detailState === 'idle' && (
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                {[
                                    ['Tahap', detail.stage_label],
                                    ['Dibuat', formatDate(detail.created_at)],
                                    [
                                        'Progress',
                                        formatDate(detail.progress_at),
                                    ],
                                    ['Telepon', detail.customer?.phone ?? '-'],
                                    [
                                        'Media sosial',
                                        detail.customer?.social_media_account ??
                                            '-',
                                    ],
                                    ['Sumber', sourceLabel(detail)],
                                    ['Area', areaLabel(detail, true)],
                                    ['Pembiayaan', financingLabel(detail)],
                                    [
                                        'Estimasi nilai',
                                        detail.estimated_value?.toLocaleString(
                                            'id-ID',
                                        ) ?? '-',
                                    ],
                                    [
                                        'Estimasi closing',
                                        detail.expected_closing_month ?? '-',
                                    ],
                                    ['Keterangan', detail.notes ?? '-'],
                                    [
                                        'Area & pembiayaan',
                                        detail.can_edit_metadata
                                            ? 'Dapat diubah'
                                            : 'Terkunci',
                                    ],
                                ].map(([term, value]) => (
                                    <div key={term} className="contents">
                                        <dt className="text-muted-foreground">
                                            {term}
                                        </dt>
                                        <dd>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {detail &&
                            detailState === 'idle' &&
                            detail.can_edit_metadata && (
                                <div className="space-y-3 border-t pt-3">
                                    {edit === null ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="min-h-11"
                                            onClick={() => startEdit(detail)}
                                        >
                                            Ubah area, pembiayaan dan keterangan
                                        </Button>
                                    ) : (
                                        <form
                                            className="space-y-3"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                saveEdit();
                                            }}
                                        >
                                            <AreaFields
                                                idPrefix="edit-"
                                                value={edit.value}
                                                onChange={(value) =>
                                                    setEdit({ ...edit, value })
                                                }
                                                regions={regions}
                                                districts={districts}
                                                errors={errors ?? {}}
                                            />
                                            <FinancingFields
                                                idPrefix="edit-"
                                                value={edit.value}
                                                onChange={(value) =>
                                                    setEdit({ ...edit, value })
                                                }
                                                leasings={leasings}
                                                errors={errors ?? {}}
                                            />
                                            <Field
                                                id="edit-notes"
                                                label="Keterangan"
                                                error={errors?.notes}
                                            >
                                                <textarea
                                                    id="edit-notes"
                                                    rows={3}
                                                    maxLength={2000}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={edit.notes}
                                                    onChange={(event) =>
                                                        setEdit({
                                                            ...edit,
                                                            notes: event.target
                                                                .value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="submit"
                                                    className="min-h-11"
                                                    disabled={edit.saving}
                                                >
                                                    {edit.saving
                                                        ? 'Menyimpan…'
                                                        : 'Simpan'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="min-h-11"
                                                    disabled={edit.saving}
                                                    onClick={() =>
                                                        setEdit(null)
                                                    }
                                                >
                                                    Batal
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        {detail?.history && detailState === 'idle' && (
                            <div>
                                <h3 className="mt-2 text-sm font-medium">
                                    Riwayat
                                </h3>
                                <ul className="mt-1 space-y-1 text-sm">
                                    {detail.history.data.map((entry) => (
                                        <li key={entry.key}>
                                            <span className="text-muted-foreground">
                                                {formatDate(entry.occurred_at)}
                                            </span>{' '}
                                            {entry.label}
                                            {entry.body
                                                ? ` — ${entry.body}`
                                                : ''}
                                        </li>
                                    ))}
                                </ul>
                                {detail.history.last_page > 1 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Menampilkan halaman pertama dari{' '}
                                        {detail.history.total} entri.
                                    </p>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
