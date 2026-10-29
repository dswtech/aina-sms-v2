import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { getNavigation } from '@/lib/navigation';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
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

            <Button variant="ghost" size="icon" className="size-11" asChild>
                <Link href="/notifications" aria-label="Buka notifikasi">
                    <Bell aria-hidden="true" className="size-5" />
                </Link>
            </Button>
        </header>
    );
}
