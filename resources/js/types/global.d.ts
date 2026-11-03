import type { Auth } from '@/types/auth';
import type { AppNotification } from '@/types/notifications';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            notifications: AppNotification[];
            notificationsUnreadCount: number;
            [key: string]: unknown;
        };
    }
}
