import { Head } from '@inertiajs/react';
import { BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, kindLabel } from '@/lib/notifications';
import { openNotification } from '@/lib/open-notification';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

export default function NotificationsIndex({
    history,
    truncated,
    limit,
}: {
    history: AppNotification[];
    truncated: boolean;
    limit: number;
}) {
    return (
        <>
            <Head title="Notifikasi" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
                        Notifikasi
                    </h1>
                    <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                        Riwayat 3 hari terakhir.
                    </p>
                </div>

                {history.length === 0 ? (
                    <div className="mt-10 flex max-w-2xl flex-col items-center gap-1.5 rounded-xl border bg-card px-6 py-12 text-center">
                        <BellOff
                            aria-hidden="true"
                            className="mb-1 size-7 text-muted-foreground"
                        />
                        <p className="text-sm font-medium">
                            Belum ada notifikasi
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Pemberitahuan baru akan muncul di sini.
                        </p>
                    </div>
                ) : (
                    <ul className="mt-10 max-w-2xl divide-y rounded-xl border bg-card">
                        {history.map((notification) => (
                            <li key={notification.id}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        openNotification(notification)
                                    }
                                    className="flex min-h-11 w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                            {kindLabel(notification.data.kind)}
                                        </Badge>
                                        {notification.read_at === null && (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                                <span
                                                    aria-hidden="true"
                                                    className="size-2 rounded-full bg-primary"
                                                />
                                                Belum dibaca
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={cn(
                                            'text-sm',
                                            notification.read_at === null
                                                ? 'font-semibold'
                                                : 'font-medium',
                                        )}
                                    >
                                        {notification.data.title ??
                                            'Notifikasi'}
                                    </span>
                                    {notification.data.message && (
                                        <span className="text-sm text-muted-foreground">
                                            {notification.data.message}
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {formatRelativeTime(
                                            notification.created_at,
                                        )}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {truncated && (
                    <p className="mt-4 max-w-2xl text-xs text-muted-foreground">
                        Menampilkan {limit} terbaru.
                    </p>
                )}
            </div>
        </>
    );
}
