import {
    BarChart3,
    Bell,
    ContactRound,
    Gauge,
    Handshake,
    Landmark,
    Network,
    Settings2,
    Target,
    Upload,
    UserRound,
    UsersRound,
} from 'lucide-react';
import type { NavItem, UserRole } from '@/types';

type NavKey =
    | 'home'
    | 'customers'
    | 'transactions'
    | 'targets'
    | 'team-performance'
    | 'analytics'
    | 'imports'
    | 'users'
    | 'teams'
    | 'dealer-settings'
    | 'notifications';

export type AppNavItem = NavItem & { key: NavKey };

const shared = {
    home: { key: 'home', title: 'Beranda', href: '/dashboard', icon: Gauge },
    transactions: {
        key: 'transactions',
        title: 'Transaksi',
        href: '/transactions',
        icon: Handshake,
    },
    targets: {
        key: 'targets',
        title: 'Target',
        href: '/targets',
        icon: Target,
    },
    teamPerformance: {
        key: 'team-performance',
        title: 'Kinerja Tim',
        href: '/team-performance',
        icon: UsersRound,
    },
    analytics: {
        key: 'analytics',
        title: 'Analisis',
        href: '/analytics',
        icon: BarChart3,
    },
    imports: {
        key: 'imports',
        title: 'Import Data',
        href: '/imports',
        icon: Upload,
    },
    users: {
        key: 'users',
        title: 'Pengguna & Undangan',
        href: '/users',
        icon: UserRound,
    },
    teams: {
        key: 'teams',
        title: 'Tim & Penempatan',
        href: '/teams',
        icon: Network,
    },
    dealerSettings: {
        key: 'dealer-settings',
        title: 'Pengaturan Dealer',
        href: '/dealer-settings',
        icon: Landmark,
    },
    notifications: {
        key: 'notifications',
        title: 'Notifikasi',
        href: '/notifications',
        icon: Bell,
    },
} satisfies Record<string, AppNavItem>;

const customerItem = (role: UserRole): AppNavItem => ({
    key: 'customers',
    title:
        role === 'sales'
            ? 'Buku Pelanggan Saya'
            : role === 'supervisor'
              ? 'Pelanggan Tim'
              : 'Pelanggan',
    href: '/customers',
    icon: ContactRound,
});

const navigationByRole: Record<UserRole, AppNavItem[]> = {
    sales: [
        shared.home,
        customerItem('sales'),
        shared.transactions,
        shared.notifications,
    ],
    supervisor: [
        shared.home,
        customerItem('supervisor'),
        shared.transactions,
        shared.targets,
        shared.analytics,
        shared.imports,
        shared.notifications,
    ],
    branch_manager: [
        shared.home,
        shared.teamPerformance,
        shared.analytics,
        shared.notifications,
    ],
    admin: [
        shared.home,
        customerItem('admin'),
        shared.transactions,
        shared.users,
        shared.teams,
        shared.analytics,
        shared.imports,
        shared.dealerSettings,
        shared.notifications,
    ],
};

const mobilePrimaryKeys: Record<UserRole, NavKey[]> = {
    sales: ['home', 'customers', 'transactions'],
    supervisor: ['home', 'customers', 'transactions'],
    branch_manager: ['home', 'team-performance', 'analytics'],
    admin: ['home', 'users', 'teams'],
};

export const roleLabels: Record<UserRole, string> = {
    sales: 'Sales',
    supervisor: 'Supervisor',
    branch_manager: 'Branch Manager',
    admin: 'Admin',
};

export function getNavigation(role: UserRole): AppNavItem[] {
    return navigationByRole[role];
}

export function getMobileNavigation(role: UserRole): {
    primary: AppNavItem[];
    more: AppNavItem[];
} {
    const items = getNavigation(role);
    const primaryKeys = mobilePrimaryKeys[role];

    return {
        primary: primaryKeys.map((key) =>
            items.find((item) => item.key === key)!,
        ),
        more: items.filter((item) => !primaryKeys.includes(item.key)),
    };
}

export const profileNavItem: NavItem = {
    title: 'Profil',
    href: '/settings/profile',
    icon: Settings2,
};
