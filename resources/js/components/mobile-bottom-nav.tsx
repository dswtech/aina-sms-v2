import { Link, usePage } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import {
    getMobileNavigation,
    profileNavItem,
    roleLabels,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const { primary, more } = getMobileNavigation(auth.user.role);
    const moreItems = [...more, profileNavItem];
    const moreIsActive = moreItems.some((item) => isCurrentUrl(item.href));

    return (
        <nav
            aria-label="Navigasi utama mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
        >
            <div className="grid h-16 grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
                {primary.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        aria-current={
                            isCurrentUrl(item.href) ? 'page' : undefined
                        }
                        className={cn(
                            'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isCurrentUrl(item.href) &&
                                'bg-accent text-accent-foreground',
                        )}
                    >
                        {item.icon && (
                            <item.icon aria-hidden="true" className="size-5" />
                        )}
                        <span className="max-w-full truncate">
                            {item.key === 'customers'
                                ? 'Pelanggan'
                                : item.title}
                        </span>
                    </Link>
                ))}

                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            aria-label="Buka menu lainnya"
                            className={cn(
                                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                moreIsActive &&
                                    'bg-accent text-accent-foreground',
                            )}
                        >
                            <MoreHorizontal
                                aria-hidden="true"
                                className="size-5"
                            />
                            <span>Lainnya</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="bottom"
                        className="rounded-t-[14px] px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                    >
                        <SheetHeader className="px-0 pt-5 text-left">
                            <SheetTitle>Menu lainnya</SheetTitle>
                            <SheetDescription>
                                Akses {roleLabels[auth.user.role]} yang tersedia
                                untuk akun Anda.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-1 pt-2">
                            {moreItems.map((item) => (
                                <SheetClose key={item.title} asChild>
                                    <Link
                                        href={item.href}
                                        aria-current={
                                            isCurrentUrl(item.href)
                                                ? 'page'
                                                : undefined
                                        }
                                        className={cn(
                                            'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                                            isCurrentUrl(item.href) &&
                                                'bg-accent text-accent-foreground',
                                        )}
                                    >
                                        {item.icon && (
                                            <item.icon
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        )}
                                        {item.title}
                                    </Link>
                                </SheetClose>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
