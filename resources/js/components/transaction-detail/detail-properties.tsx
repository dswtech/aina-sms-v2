import { router } from '@inertiajs/react';
import {
    AtSign,
    CalendarDays,
    Coins,
    CreditCard,
    MapPin,
    Phone,
    Store,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
    canEdit: boolean;
    onSaved: () => void;
};

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
        <div className="grid min-h-11 grid-cols-[7rem_minmax(0,1fr)] items-center text-sm">
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
    canEdit,
    onSaved,
}: Props) {
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
                    { preserveScroll: true, preserveState: true },
                );
        },
        [],
    );

    const save = (data: Record<string, unknown>) => {
        setError(null);
        // Pickers show server values, so they revert on their own; a typed note stays for another try.
        const fail = (message: string) => setError(message);
        router.patch(`/transactions/${detail.public_id}`, data as never, {
            preserveScroll: true,
            preserveState: true,
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

        return null;
    };

    return (
        <section aria-label="Properti transaksi">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-x-6">
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
                <Row icon={CalendarDays} label="Est. closing">
                    <Value>{detail.expected_closing_month ?? '-'}</Value>
                </Row>
                <Row icon={Phone} label="Telepon">
                    <Value>{detail.customer.phone || '-'}</Value>
                </Row>
                <Row icon={AtSign} label="Media sosial">
                    <Value>{detail.customer.social_media_account ?? '-'}</Value>
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
                placeholder="Tambah keterangan…"
                value={notes}
                readOnly={!canEdit}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    if (draft !== null && draft !== (detail.notes ?? ''))
                        save({ notes: draft || null });
                    else setDraft(null);
                }}
                className="-mx-2 block field-sizing-content min-h-11 w-[calc(100%+1rem)] resize-none rounded-md border-0 bg-transparent px-2 py-2 text-sm leading-6 outline-none hover:bg-muted read-only:hover:bg-transparent focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            />
        </section>
    );
}
