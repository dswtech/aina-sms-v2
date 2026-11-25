import {
    BarChart3,
    Bell,
    CalendarDays,
    ContactRound,
    Gauge,
    Handshake,
    Landmark,
    MessagesSquare,
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
    | 'coaching'
    | 'calendar'
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
    coaching: {
        key: 'coaching',
        title: 'Coaching',
        href: '/coaching',
        icon: MessagesSquare,
    },
    calendar: {
        key: 'calendar',
        title: 'Kalender',
        href: '/kalender',
        icon: CalendarDays,
    },
    targets: {
        key: 'targets',
        title: 'Target',
        href: '/targets',
        icon: Target,
    },
    targetsWithPlans: {
        key: 'targets',
        title: 'Target',
        href: '/targets',
        icon: Target,
        children: [
            { title: 'Target & Forecast', href: '/targets' },
            { title: 'Rencana Target Bulanan', href: '/targets/plans' },
        ],
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
        children: [
            { title: 'Sumber & Model', href: '/analytics' },
            { title: 'Pembiayaan', href: '/analytics/financing' },
            { title: 'Mapping Area', href: '/analytics/mapping-area' },
            { title: 'Capaian Sales', href: '/analytics/stage-achievement' },
        ],
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
        children: [
            { title: 'Area & PMA', href: '/dealer-settings' },
            { title: 'Leasing', href: '/dealer-settings/leasing' },
            { title: 'Master Kendaraan', href: '/dealer-settings/vehicles' },
        ],
    },
    notifications: {
        key: 'notifications',
        title: 'Notifikasi',
        href: '/notifications',
        icon: Bell,
    },
} satisfies Record<string, AppNavItem>;

// Admin has no target history: management targets stay with Supervisor and BM (ORG-06).
const analyticsWithTargets: AppNavItem = {
    ...shared.analytics,
    children: [
        ...shared.analytics.children,
        { title: 'Riwayat Target', href: '/analytics/target-history' },
    ],
};

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
        shared.coaching,
        shared.calendar,
        shared.notifications,
    ],
    supervisor: [
        shared.home,
        customerItem('supervisor'),
        shared.transactions,
        shared.coaching,
        shared.calendar,
        shared.targetsWithPlans,
        analyticsWithTargets,
        shared.imports,
        shared.notifications,
    ],
    branch_manager: [
        shared.home,
        shared.teamPerformance,
        analyticsWithTargets,
        shared.notifications,
    ],
    admin: [
        shared.home,
        customerItem('admin'),
        shared.transactions,
        shared.coaching,
        shared.users,
        shared.teams,
        shared.targets,
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
        more: items.filter(
            (item) =>
                !primaryKeys.includes(item.key) || !!item.children?.length,
        ),
    };
}

export function isNavigationItemActive(
    item: NavItem,
    currentUrl: string,
): boolean {
    const current = new URL(currentUrl, 'http://localhost');
    const target = new URL(
        typeof item.href === 'string' ? item.href : item.href.url,
        'http://localhost',
    );
    if (item.children?.length)
        return (
            current.pathname === target.pathname ||
            current.pathname.startsWith(`${target.pathname}/`)
        );
    // An open conversation lives under its transaction.
    if (target.pathname === '/coaching')
        return current.pathname.endsWith('/coaching');
    return current.pathname === target.pathname;
}

export const profileNavItem: NavItem = {
    title: 'Profil',
    href: '/settings/profile',
    icon: Settings2,
};
