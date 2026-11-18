import { Link, usePage } from '@inertiajs/react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/notifications';
import { openNotification } from '@/lib/open-notification';
import { index as notificationsIndex } from '@/routes/notifications';
import { cn } from '@/lib/utils';

export function NotificationMenu() {
    const { notifications, notificationsUnreadCount } = usePage().props;
    const items = notifications ?? [];
    const unreadCount = notificationsUnreadCount ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-11"
                    aria-label={
                        unreadCount > 0
                            ? `Notifikasi, ${unreadCount} belum dibaca`
                            : 'Notifikasi'
                    }
                >
                    <Bell aria-hidden="true" className="size-5" />
                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute top-2 right-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-destructive-foreground"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-80 max-w-[calc(100vw-2rem)] p-0"
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-semibold">Notifikasi</p>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {unreadCount} baru
                        </span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
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
                    <div className="max-h-80 overflow-y-auto">
                        {items.map((notification) => (
                            <DropdownMenuItem key={notification.id} asChild>
                                <button
                                    type="button"
                                    onClick={() =>
                                        openNotification(notification)
                                    }
                                    className={cn(
                                        'flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50',
                                    )}
                                >
                                    <span className="text-sm font-medium">
                                        {notification.data.title ??
                                            'Notifikasi'}
                                    </span>
                                    {notification.data.message && (
                                        <span className="line-clamp-2 text-xs text-muted-foreground">
                                            {notification.data.message}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                        {formatRelativeTime(
                                            notification.created_at,
                                        )}
                                    </span>
                                </button>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                <div className="border-t p-1">
                    <DropdownMenuItem asChild>
                        <Link
                            href={notificationsIndex()}
                            className="w-full cursor-pointer justify-center text-sm font-medium text-primary"
                        >
                            Lihat semua notifikasi
                        </Link>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
