import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDay, type CalendarItem } from '@/lib/calendar';

const selectClass =
    'native-select min-h-11 w-full rounded-md border bg-background px-3';

/**
 * Closes a pending plan: record the activity that resulted from it, or cancel it with a reason.
 */
export function PlanDialog({
    item,
    onClose,
}: {
    item: CalendarItem | null;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<'done' | 'cancel'>('done');
    const [type, setType] = useState('call');
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function close() {
        setMode('done');
        setText('');
        setError('');
        onClose();
    }

    function submit() {
        if (!item?.customer_id || !item.follow_up_id || saving) return;
        const options = {
            preserveScroll: true,
            onStart: () => {
                setError('');
                setSaving(true);
            },
            onFinish: () => setSaving(false),
            onSuccess: close,
            onError: (errors: Record<string, string>) =>
                setError(Object.values(errors).join(' ')),
        };

        if (mode === 'done') {
            router.post(
                `/customers/${item.customer_id}/activities`,
                { type, notes: text, follow_up_id: item.follow_up_id },
                options,
            );
        } else {
            router.patch(
                `/customers/${item.customer_id}/follow-ups/${item.follow_up_id}/cancel`,
                { reason: text },
                options,
            );
        }
    }

    return (
        <Dialog open={item !== null} onOpenChange={(open) => !open && close()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'done'
                            ? 'Catat hasil follow-up'
                            : 'Batalkan follow-up'}
                    </DialogTitle>
                    {item && (
                        <DialogDescription>
                            {item.customer} ·{' '}
                            {formatDay(item.date, {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}{' '}
                            {item.time} · {item.notes}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    {mode === 'done' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="plan-type">Kanal aktivitas</Label>
                            <select
                                id="plan-type"
                                value={type}
                                onChange={(event) =>
                                    setType(event.target.value)
                                }
                                className={selectClass}
                            >
                                <option value="call">Telepon langsung</option>
                                <option value="whatsapp">Chat WhatsApp</option>
                                <option value="visit">
                                    Kunjungan rumah / kantor
                                </option>
                                <option value="meeting">
                                    Pertemuan showroom
                                </option>
                                <option value="note">Catatan tambahan</option>
                            </select>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="plan-text">
                            {mode === 'done'
                                ? 'Hasil komunikasi'
                                : 'Alasan pembatalan'}
                        </Label>
                        <Input
                            id="plan-text"
                            required
                            maxLength={mode === 'done' ? 2000 : 500}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="min-h-11"
                        />
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setMode(mode === 'done' ? 'cancel' : 'done');
                                setError('');
                            }}
                        >
                            {mode === 'done'
                                ? 'Batalkan follow-up ini'
                                : 'Kembali ke catat hasil'}
                        </Button>
                        <Button
                            type="submit"
                            variant={
                                mode === 'done' ? 'default' : 'destructive'
                            }
                            disabled={saving || !text.trim()}
                        >
                            {saving
                                ? 'Menyimpan…'
                                : mode === 'done'
                                  ? 'Simpan & selesaikan'
                                  : 'Batalkan follow-up'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
