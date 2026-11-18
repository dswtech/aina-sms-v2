import { router } from '@inertiajs/react';
import { read as notificationsRead } from '@/routes/notifications';
import type { AppNotification } from '@/types';

export function openNotification(notification: AppNotification): void {
    router.patch(
        notificationsRead(notification.id).url,
        {},
        {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                if (notification.data.url) {
                    router.visit(notification.data.url);
                }
            },
        },
    );
}
