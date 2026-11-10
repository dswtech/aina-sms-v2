import { router } from '@inertiajs/react';
import {
    AtSign,
    Briefcase,
    CalendarDays,
    Car,
    Cake,
    Coins,
    CreditCard,
    Home,
    MapPin,
    Phone,
    Store,
    User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { VehicleOption } from '@/components/transaction-fields';
import type { ReactNode } from 'react';
import {
    GENDERS,
    INSURANCES,
    OCCUPATIONS,
    TENORS,
} from '@/lib/customer-profile';
import { areaPatch, financingPatch } from '@/lib/transaction-detail';
import {
    areaLabel,
    financingLabel,
    sourceLabel,
} from '@/lib/transaction-labels';
import type { TransactionDetailData } from '@/types/history';
import { PropertyPicker } from './property-picker';
import type { PickerStep } from './property-picker';

type Props = {
    detail: TransactionDetailData;
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    leasings: { id: number; name: string }[];
    vehicleOptions: VehicleOption[];
    canEdit: boolean;
    onSaved: () => void;
};

// Stages from which a value is required: shown beside an empty value so it can be filled early.
const REQUIRED_AT = {
    gender: 'Prospect',
    address: 'Prospect',
    occupation: 'SPK',
    area: 'SPK',
    vehicle: 'SPK',
};
const LOCKED_VEHICLE_STAGES = ['spk', 'do', 'delivery'];

// Keeps this panel's validation errors apart from the page's own forms.
const ERROR_BAG = 'transactionDetail';

function Row({
    icon: Icon,
    label,
    children,
}: {
    icon: typeof MapPin;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid min-h-11 grid-cols-[8.5rem_minmax(0,1fr)] items-center text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {label}
            </span>
            {children}
        </div>
    );
}

const Value = ({ children }: { children: ReactNode }) => (
    <div className="flex min-h-11 items-center px-2 [overflow-wrap:anywhere]">
        {children}
    </div>
);

export function DetailProperties({
    detail,
    regions,
    districts,
    leasings,
    vehicleOptions,
    canEdit,
    onSaved,
}: Props) {
    const canEditCustomer = detail.can_edit_customer;
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    // Draft is dropped whenever the server notes change (adjust-state-during-render pattern).
    const [draft, setDraft] = useState<string | null>(null);
    const [seenNotes, setSeenNotes] = useState(detail.notes);
    if (seenNotes !== detail.notes) {
        setSeenNotes(detail.notes);
        setDraft(null);
    }
    const notes = draft ?? detail.notes ?? '';

    // Closing the modal (Escape) removes the textarea without a blur: send what is still unsaved.
    const unsaved = useRef<{ url: string; value: string } | null>(null);
    useEffect(() => {
        unsaved.current =
            canEdit && draft !== null && draft !== (detail.notes ?? '')
                ? { url: `/transactions/${detail.public_id}`, value: draft }
                : null;
    }, [canEdit, draft, detail.notes, detail.public_id]);
    useEffect(
        () => () => {
            const pending = unsaved.current;
            if (pending)
                router.patch(
                    pending.url,
                    { notes: pending.value || null },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        async: true,
                        errorBag: ERROR_BAG,
                    },
                );
        },
        [],
    );

    const save = (
        data: Record<string, unknown>,
        url = `/transactions/${detail.public_id}`,
    ) => {
        setError(null);
        // Pickers show server values, so they revert on their own; a typed note stays for another try.
        const fail = (message: string) => setError(message);
        router.patch(url, data as never, {
            preserveScroll: true,
            preserveState: true,
            async: true, // a following edit must not cancel this request
            errorBag: ERROR_BAG,
            onSuccess: () => {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1600);
                onSaved();
            },
            onError: (errors) =>
                fail(
                    Object.values(errors)[0] ??
                        'Perubahan belum tersimpan. Coba lagi.',
                ),
            onHttpException: () => {
                fail('Perubahan belum tersimpan. Muat ulang lalu coba lagi.');

                return false;
            },
            onNetworkError: () => {
                fail('Koneksi terputus. Perubahan belum tersimpan.');

                return false;
            },
        });
    };

    const commit = (patch: Record<string, unknown> | null) => {
        if (patch) save(patch);
    };
    const commitCustomer = (patch: Record<string, unknown> | null) => {
        if (patch && detail.customer.public_id)
            save(
                { customer: patch },
                `/customers/${detail.customer.public_id}/profile`,
            );
    };

    const hint = (field: keyof typeof REQUIRED_AT, filled: boolean) =>
        filled ? '' : `Belum diisi · wajib di ${REQUIRED_AT[field]}`;
    const vehicleLocked = LOCKED_VEHICLE_STAGES.includes(detail.current_stage);
    const vehicleStep = (chosen: string[]): PickerStep | null =>
        chosen.length > 0
            ? null
            : {
                  title: 'Kendaraan',
                  options: [
                      ...(vehicleLocked
                          ? []
                          : [{ value: '', label: 'Belum ditentukan' }]),
                      ...vehicleOptions.flatMap((group) =>
                          group.models.map((model) => ({
                              value: model.name,
                              label: `${model.name} · ${group.type}`,
                          })),
                      ),
                  ],
              };
    const optionStep =
        (title: string, options: { value: string; label: string }[]) =>
        (chosen: string[]): PickerStep | null =>
            chosen.length > 0 ? null : { title, options };
    const textStep =
        (title: string, type?: 'date') =>
        (chosen: string[]): PickerStep | null =>
            chosen.length > 0 ? null : { title, text: true, type };
    const customerAreaStep = (chosen: string[]): PickerStep | null => {
        const next = areaStep(chosen);

        // The server never blanks a customer value, so there is no "Belum diisi" choice here.
        return next && 'options' in next
            ? { ...next, options: next.options.filter((o) => o.value !== '') }
            : next;
    };

    const regionName = (code: string) =>
        regions.find((region) => region.code === code)?.name ?? code;

    const areaStep = (chosen: string[]): PickerStep | null => {
        if (chosen.length === 0)
            return {
                title: 'Kabupaten/Kota',
                options: [
                    { value: '', label: 'Belum diisi' },
                    ...regions.map((r) => ({ value: r.code, label: r.name })),
                    { value: 'other', label: 'Kota Lain' },
                ],
            };
        if (chosen.length > 1 || chosen[0] === '') return null;
        if (chosen[0] === 'other') return { title: 'Nama kota', text: true };

        return {
            title: `Kecamatan di ${regionName(chosen[0])}`,
            options: districts
                .filter((d) => d.region_code === chosen[0])
                .map((d) => ({ value: d.code, label: d.name })),
        };
    };

    const financingStep = (chosen: string[]): PickerStep | null => {
        if (chosen.length === 0)
            return {
                title: 'Pembiayaan',
                options: [
                    { value: '', label: 'Belum ditentukan' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'credit', label: 'Kredit' },
                ],
            };
        if (chosen[0] !== 'credit') return null;
        if (chosen.length === 1)
            return {
                title: 'Leasing',
                options: [
                    ...leasings.map((l) => ({
                        value: String(l.id),
                        label: l.name,
                    })),
                    { value: 'other', label: 'Kredit Lain' },
                ],
            };
        if (chosen.length === 2 && chosen[1] === 'other')
            return { title: 'Nama leasing', text: true };
        // Past the leasing (and its name for Kredit Lain): tenor, then insurance.
        const done = chosen[1] === 'other' ? 3 : 2;
        if (chosen.length === done)
            return {
                title: 'Tenor',
                options: TENORS.map((months) => ({
                    value: String(months),
                    label: `${months} bulan`,
                })),
            };
        if (chosen.length === done + 1)
            return {
                title: 'Jenis asuransi',
                options: INSURANCES.map((i) => ({
                    value: i.value,
                    label: i.label,
                })),
            };

        return null;
    };

    const customerArea = detail.customer.area;
    const customerAreaLabel = customerArea.other_city
        ? customerArea.other_city
        : (districts.find((d) => d.code === customerArea.district_code)?.name ??
          '-');
    const optionLabel = (
        options: { value: string; label: string }[],
        value: string | null,
    ) => options.find((o) => o.value === value)?.label ?? '-';

    return (
        <section aria-label="Properti transaksi">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-x-6">
                <Row icon={Car} label="Kendaraan">
                    <PropertyPicker
                        label="Kendaraan"
                        display={detail.vehicle_model ?? hint('vehicle', false)}
                        disabled={!canEdit}
                        getStep={vehicleStep}
                        onCommit={(chosen) =>
                            commit({ vehicle_model: chosen[0] || null })
                        }
                    />
                </Row>
                <Row icon={MapPin} label="Area">
                    <PropertyPicker
                        label="Area"
                        display={areaLabel(detail, true)}
                        disabled={!canEdit}
                        getStep={areaStep}
                        onCommit={(chosen) => commit(areaPatch(chosen))}
                    />
                </Row>
                <Row icon={CreditCard} label="Pembiayaan">
                    <PropertyPicker
                        label="Pembiayaan"
                        display={financingLabel(detail)}
                        disabled={!canEdit}
                        getStep={financingStep}
                        onCommit={(chosen) => commit(financingPatch(chosen))}
                    />
                </Row>
                <Row icon={Store} label="Sumber">
                    <Value>{sourceLabel(detail)}</Value>
                </Row>
                <Row icon={Coins} label="Estimasi nilai">
                    <Value>
                        {detail.estimated_value?.toLocaleString('id-ID') ?? '-'}
                    </Value>
                </Row>
                <Row icon={CalendarDays} label="Estimasi closing">
                    <Value>{detail.expected_closing_month ?? '-'}</Value>
                </Row>
                <Row icon={Phone} label="Telepon">
                    <PropertyPicker
                        label="Telepon"
                        display={detail.customer.phone || '-'}
                        disabled={!canEditCustomer}
                        getStep={textStep('Telepon')}
                        onCommit={(chosen) =>
                            commitCustomer({ phone: chosen[0]?.trim() })
                        }
                    />
                </Row>
                <Row icon={AtSign} label="Media sosial">
                    <Value>{detail.customer.social_media_account ?? '-'}</Value>
                </Row>
                <Row icon={User} label="Gender">
                    <PropertyPicker
                        label="Gender"
                        display={
                            detail.customer.gender
                                ? optionLabel(GENDERS, detail.customer.gender)
                                : hint('gender', false)
                        }
                        disabled={!canEditCustomer}
                        getStep={optionStep('Gender', GENDERS)}
                        onCommit={(chosen) =>
                            commitCustomer({ gender: chosen[0] })
                        }
                    />
                </Row>
                <Row icon={Cake} label="Tanggal lahir">
                    <PropertyPicker
                        label="Tanggal lahir"
                        display={detail.customer.birth_date ?? '-'}
                        disabled={!canEditCustomer}
                        getStep={textStep('Tanggal lahir', 'date')}
                        onCommit={(chosen) =>
                            commitCustomer({ birth_date: chosen[0]?.trim() })
                        }
                    />
                </Row>
                <Row icon={Briefcase} label="Pekerjaan">
                    <PropertyPicker
                        label="Pekerjaan"
                        display={
                            detail.customer.occupation
                                ? optionLabel(
                                      OCCUPATIONS,
                                      detail.customer.occupation,
                                  )
                                : hint('occupation', false)
                        }
                        disabled={!canEditCustomer}
                        getStep={optionStep('Pekerjaan', OCCUPATIONS)}
                        onCommit={(chosen) =>
                            commitCustomer({ occupation: chosen[0] })
                        }
                    />
                </Row>
                <Row icon={Home} label="Alamat">
                    <PropertyPicker
                        label="Alamat"
                        display={
                            detail.customer.address ?? hint('address', false)
                        }
                        disabled={!canEditCustomer}
                        getStep={textStep('Alamat')}
                        onCommit={(chosen) =>
                            commitCustomer({ address: chosen[0]?.trim() })
                        }
                    />
                </Row>
                <Row icon={MapPin} label="Kecamatan">
                    <PropertyPicker
                        label="Kecamatan pelanggan"
                        display={
                            customerAreaLabel === '-'
                                ? hint('area', false)
                                : customerAreaLabel
                        }
                        disabled={!canEditCustomer}
                        getStep={customerAreaStep}
                        onCommit={(chosen) => commitCustomer(areaPatch(chosen))}
                    />
                </Row>
            </div>
            <div className="min-h-5 text-right text-xs">
                {error && (
                    <p role="alert" className="text-destructive">
                        {error}
                    </p>
                )}
                {saved && !error && (
                    <p role="status" className="text-green-600">
                        Tersimpan
                    </p>
                )}
            </div>
            <hr className="my-2" />
            <textarea
                aria-label="Keterangan"
                placeholder={
                    canEdit ? 'Tambah keterangan…' : 'Tidak ada keterangan'
                }
                value={notes}
                readOnly={!canEdit}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    if (draft !== null && draft !== (detail.notes ?? ''))
                        save({ notes: draft || null });
                    else setDraft(null);
                }}
                className="-mx-2 block field-sizing-content min-h-16 w-[calc(100%+1rem)] resize-none rounded-md border-0 bg-transparent px-2 py-2 text-sm leading-6 outline-none hover:bg-muted read-only:hover:bg-transparent focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            />
        </section>
    );
}
