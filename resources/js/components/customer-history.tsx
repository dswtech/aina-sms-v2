import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    HistoryPagination,
    historyDate,
    TransactionTimeline,
} from '@/components/transaction-timeline';
import type {
    CustomerHistoryData,
    HistoryTransaction,
    TimelineComment,
} from '@/types/history';

type Props = {
    customerId: string;
    refreshKey: unknown;
    onSelection: (
        transaction: HistoryTransaction | null,
        ready: boolean,
        invalidate?: boolean,
    ) => void;
    onReply: (comment: TimelineComment) => void;
    onEdit: (comment: TimelineComment) => void;
};
export function CustomerHistory({
    customerId,
    refreshKey,
    onSelection,
    onReply,
    onEdit,
}: Props) {
    const [data, setData] = useState<CustomerHistoryData | null>(null);
    const [request, setRequest] = useState({
        transaction: '',
        activityPage: 1,
        timelinePage: 1,
        retry: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const generation = useRef(0);
    useEffect(() => {
        const controller = new AbortController();
        const version = ++generation.current;
        let accessRevoked = false;
        setLoading(true);
        setError('');
        setData(null);
        onSelection(null, false);
        const params = new URLSearchParams({
            activity_page: String(request.activityPage),
            timeline_page: String(request.timelinePage),
        });
        if (request.transaction) params.set('transaction', request.transaction);
        fetch(`/customers/${customerId}/history?${params}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                accessRevoked =
                    response.redirected ||
                    [401, 403, 404].includes(response.status);
                if (!response.ok || accessRevoked)
                    throw new Error(
                        accessRevoked
                            ? 'Akses riwayat sudah tidak tersedia.'
                            : 'Riwayat belum dapat dimuat.',
                    );
                return response.json() as Promise<CustomerHistoryData>;
            })
            .then((result) => {
                if (version !== generation.current || controller.signal.aborted)
                    return;
                setData(result);
                onSelection(result.selected_transaction, true);
            })
            .catch((failure: unknown) => {
                if (controller.signal.aborted || version !== generation.current)
                    return;
                onSelection(null, false, accessRevoked);
                setError(
                    failure instanceof Error
                        ? failure.message
                        : 'Riwayat belum dapat dimuat.',
                );
            })
            .finally(() => {
                if (
                    version === generation.current &&
                    !controller.signal.aborted
                )
                    setLoading(false);
            });
        return () => controller.abort();
    }, [customerId, request, refreshKey, onSelection]);
    return (
        <div className="min-w-0 space-y-6" aria-busy={loading}>
            {loading && (
                <p role="status" className="text-sm text-muted-foreground">
                    Memuat riwayat…
                </p>
            )}
            {error && (
                <div role="alert" className="space-y-2 text-sm">
                    <p>{error}</p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            setRequest((previous) => ({
                                ...previous,
                                retry: previous.retry + 1,
                            }))
                        }
                    >
                        Coba lagi
                    </Button>
                </div>
            )}
            {data && (
                <>
                    <div>
                        <Label htmlFor="history-transaction">
                            Pilih transaksi
                        </Label>
                        <select
                            id="history-transaction"
                            className="mt-2 min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                            value={data.selected_transaction?.public_id ?? ''}
                            onChange={(event) =>
                                setRequest((previous) => ({
                                    ...previous,
                                    transaction: event.target.value,
                                    timelinePage: 1,
                                }))
                            }
                        >
                            {data.transactions.length === 0 && (
                                <option value="">Belum ada transaksi</option>
                            )}
                            {data.transactions.map((transaction) => (
                                <option
                                    key={transaction.public_id}
                                    value={transaction.public_id}
                                >
                                    {transaction.vehicle_model} ·{' '}
                                    {transaction.stage_label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {data.selected_transaction && (
                        <TransactionTimeline
                            page={data.timeline}
                            onPageChange={(timelinePage) =>
                                setRequest((previous) => ({
                                    ...previous,
                                    timelinePage,
                                }))
                            }
                            onReply={
                                data.selected_transaction.can_comment
                                    ? onReply
                                    : undefined
                            }
                            onEdit={
                                data.selected_transaction.can_comment
                                    ? onEdit
                                    : undefined
                            }
                        />
                    )}
                    <section aria-label="Aktivitas hubungan">
                        <h4 className="text-sm font-semibold">
                            Aktivitas hubungan
                        </h4>
                        {data.activities.data.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Belum ada aktivitas tercatat.
                            </p>
                        ) : (
                            <ol className="mt-3 space-y-3">
                                {data.activities.data.map((activity) => (
                                    <li
                                        key={activity.id}
                                        className="text-sm [overflow-wrap:anywhere]"
                                    >
                                        <p className="font-medium">
                                            {activity.type_label} ·{' '}
                                            {activity.user_name ?? 'Pengguna'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {historyDate(activity.occurred_at)}
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap">
                                            {activity.notes}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <HistoryPagination
                            page={data.activities}
                            label="Aktivitas"
                            onPageChange={(activityPage) =>
                                setRequest((previous) => ({
                                    ...previous,
                                    activityPage,
                                }))
                            }
                        />
                    </section>
                </>
            )}
        </div>
    );
}
