export type UserRole = 'sales' | 'supervisor' | 'branch_manager' | 'admin';

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
