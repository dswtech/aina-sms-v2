import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { getNavigation } from '@/lib/navigation';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const getInitials = useInitials();
    const currentItem = getNavigation(auth.user.role).find((item) =>
        isCurrentUrl(item.href),
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-5 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 hidden size-10 md:inline-flex" />
                <Link
                    href="/dashboard"
                    aria-label="Kembali ke Beranda"
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
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
                <Button variant="ghost" size="icon" className="size-11" asChild>
                    <Link href="/notifications" aria-label="Buka notifikasi">
                        <Bell aria-hidden="true" className="size-5" />
                    </Link>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="size-11 rounded-full p-1"
                            aria-label="Buka kontrol panel pengguna"
                        >
                            <Avatar className="size-8 overflow-hidden rounded-full">
                                <AvatarImage
                                    src={auth.user.avatar}
                                    alt={auth.user.name}
                                />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="end">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
