import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { CustomerContactPreferences } from '@/components/customer-contact-preferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/transaction-labels';
import type { TransactionDetailData } from '@/types/history';

type SalesUser = { id: number; name: string };

// Separate bags keep each form's errors apart from the properties panel and the page.
const BAG = {
    assign: 'detailAssignment',
    activity: 'detailActivity',
    followUp: 'detailFollowUp',
};

const selectClass =
    'native-select min-h-11 w-full rounded-md border bg-background px-3';

/** Posts through Inertia with the page state kept, so the open modal survives the redirect. */
function usePost(
    method: 'post' | 'patch',
    url: string,
    bag: string,
    onSaved: () => void,
) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const send = (data: Record<string, unknown>, onDone?: () => void) => {
        if (saving) return;
        router[method](url, data as never, {
            preserveScroll: true,
            preserveState: true,
            async: true,
            errorBag: bag,
            onStart: () => {
                setError('');
                setSaving(true);
            },
            onFinish: () => setSaving(false),
            onSuccess: () => {
                onDone?.();
                onSaved();
            },
            onError: (errors) => setError(Object.values(errors).join(' ')),
            onNetworkError: () => {
                setError(
                    'Koneksi terputus. Isian tetap tersedia. Periksa riwayat sebelum mencoba lagi.',
                );

                return false;
            },
            onHttpException: (response) => {
                if (response.status < 500) return;
                setError(
                    'Belum dapat dipastikan tersimpan. Isian tetap tersedia. Periksa riwayat sebelum mencoba lagi.',
                );

                return false;
            },
        });
    };

    return { saving, error, send };
}

function Message({ error }: { error: string }) {
    return error ? (
        <p role="alert" className="text-sm text-destructive">
            {error}
        </p>
    ) : null;
}

export function CustomerPanel({
    detail,
    assignableSales,
    onSaved,
}: {
    detail: TransactionDetailData;
    assignableSales: SalesUser[];
    onSaved: () => void;
}) {
    const { customer } = detail;
    const [salesId, setSalesId] = useState('');
    const assign = usePost(
        'patch',
        `/customers/${customer.public_id}/assignment`,
        BAG.assign,
        onSaved,
    );

    if (!customer.public_id) return null;

    return (
        <div className="space-y-4">
            <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Terakhir dihubungi</dt>
                <dd>
                    {customer.last_contact_at
                        ? formatDate(customer.last_contact_at)
                        : '-'}
                </dd>
                <dt className="text-muted-foreground">PIC Sales</dt>
                <dd>{customer.assigned_sales?.name ?? '-'}</dd>
            </dl>
            {detail.can_assign_customer && assignableSales.length > 0 && (
                <form
                    className="space-y-2 rounded-lg border p-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (salesId)
                            assign.send({ sales_id: Number(salesId) }, () =>
                                setSalesId(''),
                            );
                    }}
                >
                    <Label htmlFor="detail-reassign">Ganti PIC Sales</Label>
                    <select
                        id="detail-reassign"
                        value={salesId}
                        onChange={(event) => setSalesId(event.target.value)}
                        className={selectClass}
                    >
                        <option value="">Pilih Sales</option>
                        {assignableSales
                            .filter((s) => s.id !== customer.assigned_sales?.id)
                            .map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                    </select>
                    <Message error={assign.error} />
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={!salesId || assign.saving}
                    >
                        {assign.saving ? 'Menyimpan…' : 'Ganti PIC'}
                    </Button>
                </form>
            )}
            <Button asChild variant="outline">
                <Link
                    href={`/transactions/create?customer=${customer.public_id}`}
                >
                    Buat transaksi baru
                </Link>
            </Button>
            {detail.can_edit_customer && (
                <CustomerContactPreferences
                    key={`${customer.opt_out}-${customer.contact_channel_preference}`}
                    customer={{
                        public_id: customer.public_id,
                        contact_channel_preference:
                            customer.contact_channel_preference,
                        opt_out: customer.opt_out,
                    }}
                    keepState
                    onSaved={onSaved}
                />
            )}
        </div>
    );
}

export function ActivityForm({
    detail,
    onSaved,
}: {
    detail: TransactionDetailData;
    onSaved: () => void;
}) {
    const [type, setType] = useState('call');
    const [notes, setNotes] = useState('');
    const post = usePost(
        'post',
        `/customers/${detail.customer.public_id}/activities`,
        BAG.activity,
        onSaved,
    );

    return (
        <form
            className="space-y-2 border-t p-3"
            aria-label="Catat aktivitas"
            onSubmit={(event) => {
                event.preventDefault();
                post.send(
                    { type, notes, deal_transaction_id: detail.deal_id },
                    () => setNotes(''),
                );
            }}
        >
            <Label htmlFor="detail-act-type">Kanal aktivitas</Label>
            <select
                id="detail-act-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className={selectClass}
            >
                <option value="call">Telepon langsung</option>
                <option value="whatsapp">Chat WhatsApp</option>
                <option value="visit">Kunjungan rumah / kantor</option>
                <option value="meeting">Pertemuan showroom</option>
                <option value="note">Catatan tambahan</option>
            </select>
            <Label htmlFor="detail-act-notes">Hasil komunikasi</Label>
            <Input
                id="detail-act-notes"
                required
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-11"
            />
            <Message error={post.error} />
            <Button type="submit" disabled={post.saving || !notes.trim()}>
                {post.saving ? 'Menyimpan…' : 'Catat aktivitas'}
            </Button>
        </form>
    );
}

export function FollowUpPanel({
    detail,
    onSaved,
}: {
    detail: TransactionDetailData;
    onSaved: () => void;
}) {
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const next = detail.customer.next_follow_up;
    const post = usePost(
        'post',
        `/customers/${detail.customer.public_id}/follow-ups`,
        BAG.followUp,
        onSaved,
    );

    return (
        <div className="space-y-4">
            <div className="text-sm">
                <p className="text-muted-foreground">Follow-up berikutnya</p>
                {next ? (
                    <p>
                        {formatDate(next.scheduled_at)} · {next.plan_notes}
                    </p>
                ) : (
                    <p>Belum ada jadwal.</p>
                )}
            </div>
            <form
                className="space-y-2 rounded-lg border p-3"
                aria-label="Jadwalkan follow-up"
                onSubmit={(event) => {
                    event.preventDefault();
                    post.send(
                        {
                            scheduled_at: date,
                            plan_notes: notes,
                            deal_transaction_id: detail.deal_id,
                        },
                        () => {
                            setDate('');
                            setNotes('');
                        },
                    );
                }}
            >
                <Label htmlFor="detail-fu-date">Waktu follow-up</Label>
                <Input
                    id="detail-fu-date"
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="min-h-11"
                />
                <Label htmlFor="detail-fu-notes">Rencana</Label>
                <Input
                    id="detail-fu-notes"
                    required
                    maxLength={2000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-11"
                />
                <Message error={post.error} />
                <Button
                    type="submit"
                    disabled={post.saving || !date || !notes.trim()}
                >
                    {post.saving ? 'Menyimpan…' : 'Jadwalkan'}
                </Button>
            </form>
        </div>
    );
}
