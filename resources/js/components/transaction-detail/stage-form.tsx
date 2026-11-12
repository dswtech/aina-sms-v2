import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { CustomerProfileFields } from '@/components/customer-profile-fields';
import { DoChecklist, emptyDoChecklist } from '@/components/do-checklist';
import { ClosingMonthForm } from '@/components/team-performance';
import { VehicleSelect } from '@/components/transaction-fields';
import type { VehicleOption } from '@/components/transaction-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    draftFromProfile,
    missingProfileFields,
    profilePayload,
    requiredProfileFields,
} from '@/lib/customer-profile';
import { stageDirection } from '@/lib/transaction-detail';
import type { TransactionDetailData } from '@/types/history';

export type StageAction = 'delivery' | 'cancel' | null;

type Option = { value: string; label: string };

type Props = {
    detail: TransactionDetailData;
    action: StageAction;
    stages: Option[];
    lostReasons: Option[];
    vehicleOptions: VehicleOption[];
    regions: { code: string; name: string }[];
    districts: { code: string; region_code: string; name: string }[];
    onDone: () => void;
    onCancel: () => void;
};

// Keeps this form's validation errors apart from the properties panel and the page.
const ERROR_BAG = 'transactionStage';

const selectClass =
    'native-select mt-2 min-h-11 w-full rounded-md border bg-background px-3';

const titles = {
    delivery: 'Konfirmasi Delivery',
    cancel: 'Batalkan DO',
    stage: 'Ubah tahap',
};

export function StageForm({
    detail,
    action,
    stages,
    lostReasons,
    vehicleOptions,
    regions,
    districts,
    onDone,
    onCancel,
}: Props) {
    const choices = stages.filter(
        (item) =>
            item.value !== 'delivery' &&
            item.value !== detail.current_stage &&
            (item.value !== 'do' || detail.can_record_do),
    );
    // Starts on the next stage forward, so the common move is one click.
    const pipeline = ['lead', 'prospect', 'hot_prospect', 'spk', 'do'];
    const next = pipeline[pipeline.indexOf(detail.current_stage) + 1];
    const [toStage, setToStage] = useState(
        choices.find((item) => item.value === next)?.value ??
            choices[0]?.value ??
            '',
    );
    const stageTone = (value: string, way: string | null) =>
        value === 'do'
            ? 'font-bold text-emerald-700 dark:text-emerald-400'
            : value === 'lost'
              ? 'font-bold text-red-600 dark:text-red-400'
              : way === 'backward'
                ? 'text-amber-700 dark:text-amber-400'
                : way === 'forward'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : '';
    const [notes, setNotes] = useState('');
    const [bookingFee, setBookingFee] = useState(false);
    const [vehicle, setVehicle] = useState('');
    const [profile, setProfile] = useState(draftFromProfile());
    const [doChecklist, setDoChecklist] = useState(emptyDoChecklist);
    const [lostReason, setLostReason] = useState('');
    const [lostNotes, setLostNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const target = action ?? toStage;
    const direction = action
        ? null
        : stageDirection(detail.current_stage, toStage);
    const backward = direction === 'backward';
    // Fields the saved profile still lacks. The left panel edits the same data; this is a shortcut.
    const profileFields = missingProfileFields(target, detail.customer_profile);
    const title = titles[action ?? 'stage'];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (saving) return;
        const options = {
            preserveScroll: true,
            preserveState: true,
            async: true,
            errorBag: ERROR_BAG,
            onStart: () => {
                setNetworkError(false);
                setErrors({});
                setSaving(true);
            },
            onFinish: () => setSaving(false),
            onError: (bag: Record<string, string>) => setErrors(bag),
            onNetworkError: () => {
                setNetworkError(true);
                return false;
            },
            onSuccess: onDone,
        };
        const url = `/transactions/${detail.public_id}`;
        if (action === 'cancel') {
            router.post(
                `${url}/cancel-do`,
                { reason: notes.trim(), do_event_id: detail.do_event_id },
                options,
            );

            return;
        }
        router.patch(
            `${url}/stage`,
            {
                to_stage: target,
                do_event_id: detail.do_event_id,
                stage_event_id: detail.stage_event_id,
                notes: notes || null,
                booking_fee_confirmed: bookingFee,
                vehicle_model: vehicle || undefined,
                customer: profilePayload(
                    profile,
                    requiredProfileFields(target),
                ),
                ...doChecklist,
                lost_reason: lostReason || null,
                lost_notes: lostNotes || null,
            },
            options,
        );
    };

    const messages = Object.values(errors);

    return (
        <div className="space-y-4">
            {/* A sibling of the stage form: nested forms would swallow its submit. */}
            {!action && (
                <ClosingMonthForm
                    key={detail.public_id}
                    transactionId={detail.public_id}
                    month={detail.expected_closing_month}
                />
            )}
            <form onSubmit={submit} className="space-y-4" aria-label={title}>
                {!action && (
                    <>
                        <div>
                            <Label htmlFor="stage-to">Tahap baru</Label>
                            <select
                                id="stage-to"
                                value={toStage}
                                onChange={(event) =>
                                    setToStage(event.target.value)
                                }
                                className={`${selectClass} ${stageTone(toStage, direction)}`}
                            >
                                {choices.map((item) => {
                                    const way = stageDirection(
                                        detail.current_stage,
                                        item.value,
                                    );

                                    return (
                                        <option
                                            key={item.value}
                                            value={item.value}
                                            className={stageTone(
                                                item.value,
                                                way,
                                            )}
                                        >
                                            {way === 'forward'
                                                ? `▲ ${item.label}`
                                                : way === 'backward'
                                                  ? `▼ ${item.label}`
                                                  : item.label}
                                        </option>
                                    );
                                })}
                            </select>
                            {direction && (
                                <p
                                    className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${backward ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                                >
                                    {backward ? (
                                        <ArrowDown
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <ArrowUp
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {backward
                                        ? 'Mundur tahap: alasan wajib diisi pada catatan.'
                                        : 'Maju tahap.'}
                                </p>
                            )}
                        </div>
                    </>
                )}
                {action === 'delivery' && (
                    <p className="text-sm text-muted-foreground">
                        Konfirmasi bahwa kendaraan sudah terkirim.
                    </p>
                )}
                {action === 'cancel' ? (
                    <div className="space-y-1">
                        <Label htmlFor="stage-cancel-reason">
                            Alasan pembatalan
                        </Label>
                        <Input
                            id="stage-cancel-reason"
                            required
                            maxLength={2000}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            Transaksi kembali ke SPK dan DO ini dikeluarkan dari
                            realisasi.
                        </p>
                    </div>
                ) : (
                    !action && (
                        <div>
                            <Label htmlFor="stage-notes">
                                {backward ? 'Catatan alasan mundur' : 'Catatan'}
                            </Label>
                            <Input
                                id="stage-notes"
                                required={backward}
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                className="mt-2 min-h-11"
                            />
                        </div>
                    )
                )}
                {!action && profileFields.length > 0 && (
                    <div className="space-y-3 rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">
                            Lengkapi data pelanggan untuk tahap ini. Data yang
                            sama bisa diisi kapan saja di panel kiri.
                        </p>
                        <CustomerProfileFields
                            fields={profileFields}
                            requiredFields={profileFields}
                            value={profile}
                            onChange={setProfile}
                            regions={regions}
                            districts={districts}
                            errors={errors}
                            errorPrefix="customer."
                            idPrefix="stage-"
                        />
                    </div>
                )}
                {!action && toStage === 'spk' && !detail.vehicle_model && (
                    <div>
                        <Label htmlFor="stage-vehicle">
                            Kendaraan (wajib untuk SPK)
                        </Label>
                        <div className="mt-2">
                            <VehicleSelect
                                id="stage-vehicle"
                                value={vehicle}
                                options={vehicleOptions}
                                onChange={setVehicle}
                            />
                        </div>
                    </div>
                )}
                {!action && toStage === 'spk' && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={bookingFee}
                            onChange={(event) =>
                                setBookingFee(event.target.checked)
                            }
                        />
                        Konfirmasi booking fee
                    </label>
                )}
                {!action && toStage === 'do' && (
                    <DoChecklist
                        value={doChecklist}
                        onChange={setDoChecklist}
                    />
                )}
                {!action && toStage === 'lost' && (
                    <>
                        <div>
                            <Label htmlFor="stage-lost-reason">
                                Alasan lost
                            </Label>
                            <select
                                id="stage-lost-reason"
                                value={lostReason}
                                onChange={(event) =>
                                    setLostReason(event.target.value)
                                }
                                className={selectClass}
                            >
                                <option value="">Pilih alasan</option>
                                {lostReasons.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="stage-lost-notes">
                                Catatan lost
                            </Label>
                            <Input
                                id="stage-lost-notes"
                                value={lostNotes}
                                onChange={(event) =>
                                    setLostNotes(event.target.value)
                                }
                                className="mt-2 min-h-11"
                            />
                        </div>
                    </>
                )}
                {networkError ? (
                    <p role="alert" className="text-sm text-destructive">
                        Koneksi terputus saat menyimpan tahap. Draft tetap
                        tersedia. Periksa status transaksi sebelum mencoba lagi.
                    </p>
                ) : (
                    messages.length > 0 && (
                        <p role="alert" className="text-sm text-destructive">
                            {messages.join(' ')}
                        </p>
                    )
                )}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={onCancel}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant={
                            action === 'cancel' ? 'destructive' : 'default'
                        }
                        className="min-h-11"
                        disabled={
                            saving ||
                            (action === 'cancel' && !notes.trim()) ||
                            (backward && !notes.trim()) ||
                            (!action &&
                                toStage === 'do' &&
                                !Object.values(doChecklist).every(Boolean))
                        }
                    >
                        {saving
                            ? 'Menyimpan…'
                            : action
                              ? title
                              : 'Simpan tahap'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
