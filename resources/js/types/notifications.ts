export type AppNotification = {
    id: string;
    data: {
        title?: string;
        message?: string;
        url?: string;
        [key: string]: unknown;
    };
    created_at: string | null;
};
