import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationMenu } from '@/components/notification-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import {
    getNavigation,
    isNavigationItemActive,
    roleLabels,
} from '@/lib/navigation';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const { url } = usePage();
    const getInitials = useInitials();
    const currentItem = getNavigation(auth.user.role).find((item) =>
        isNavigationItemActive(item, url),
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-5 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 hidden size-11 md:inline-flex" />
                <Link
                    href="/dashboard"
                    aria-label="Kembali ke Beranda"
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
                >
                    <AppLogoIcon className="size-5" />
                </Link>
                <div className="min-w-0">
                    <div className="md:hidden">
                        <p className="truncate text-sm font-semibold">
                            {currentItem?.title ?? 'DealDrive Supervisor'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {auth.user.name}
                        </p>
                    </div>
                    <div className="hidden md:block">
                        {breadcrumbs.length > 0 ? (
                            <Breadcrumbs breadcrumbs={breadcrumbs} />
                        ) : (
                            <p className="text-sm font-semibold">
                                {currentItem?.title ?? 'Ruang kerja'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <NotificationMenu />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label="Buka kontrol panel pengguna"
                            className="flex items-center gap-2 rounded-xl border bg-muted/50 p-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:pr-3"
                        >
                            <Avatar className="size-9 shrink-0 rounded-full">
                                <AvatarImage
                                    src={auth.user.avatar}
                                    alt={auth.user.name}
                                />
                                <AvatarFallback className="rounded-full bg-primary text-primary-foreground">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden min-w-0 md:block">
                                <span className="block max-w-40 truncate text-sm font-semibold">
                                    {auth.user.name}
                                </span>
                                <span className="block max-w-40 truncate text-xs text-muted-foreground">
                                    {roleLabels[auth.user.role]}
                                </span>
                            </span>
                            <ChevronDown
                                aria-hidden="true"
                                className="hidden size-4 shrink-0 text-muted-foreground md:block"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-80 max-w-[calc(100vw-2rem)]"
                        align="end"
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
