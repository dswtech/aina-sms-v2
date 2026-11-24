import type { Auth } from '@/types/auth';
import type { AppNotification } from '@/types/notifications';
import type { TargetReminder } from '@/lib/target-reminder';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            appVersion: string;
            auth: Auth;
            sidebarOpen: boolean;
            notifications: AppNotification[];
            notificationsUnreadCount: number;
            targetReminder: TargetReminder | null;
            [key: string]: unknown;
        };
    }
}
