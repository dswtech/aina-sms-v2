export type AppNotification = {
    id: string;
    data: {
        title?: string;
        message?: string;
        url?: string;
        kind?: string;
        count?: number;
        [key: string]: unknown;
    };
    created_at: string | null;
    read_at: string | null;
};
