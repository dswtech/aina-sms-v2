export type UserRole = 'sales' | 'supervisor' | 'branch_manager' | 'admin';

export type User = {
    public_id: string;
    name: string;
    username: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    role: UserRole;
    is_active: boolean;
};

export type Auth = {
    user: User;
};
