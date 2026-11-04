import { Link, router } from '@inertiajs/react';
import { LogOut, UserRound, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import ColorPicker from '@/components/color-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { FONT_SIZE_OPTIONS, useFontSize } from '@/hooks/use-font-size';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { roleLabels } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

function MenuRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const getInitials = useInitials();
    const { appearance, updateAppearance } = useAppearance();
    const { fontSize, updateFontSize } = useFontSize();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-10 rounded-full">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="rounded-full bg-primary text-primary-foreground">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                            {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {roleLabels[user.role]}
                        </p>
                    </div>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="w-full cursor-pointer px-4 py-2"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <UserRound className="size-4" />
                        Profil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled
                    className="px-4 py-2"
                    title="Dokumentasi belum tersedia"
                >
                    <BookOpen className="size-4" />
                    Dokumentasi
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="py-1.5">
                <MenuRow label="Tema">
                    <DropdownMenuRadioGroup
                        value={appearance}
                        aria-label="Tema"
                        className="inline-flex rounded-lg bg-muted p-0.5"
                    >
                        {(
                            [
                                { value: 'light', label: 'Terang' },
                                { value: 'dark', label: 'Gelap' },
                                { value: 'system', label: 'Sistem' },
                            ] as const
                        ).map((option) => (
                            <DropdownMenuRadioItem
                                key={option.value}
                                value={option.value}
                                onSelect={(event) => {
                                    event.preventDefault();
                                    updateAppearance(option.value);
                                }}
                                className={cn(
                                    'min-h-11 min-w-11 justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors [&>span:first-child]:hidden',
                                    appearance === option.value
                                        ? 'bg-background text-primary shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {option.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </MenuRow>
                <MenuRow label="Ukuran">
                    <DropdownMenuRadioGroup
                        value={fontSize}
                        aria-label="Ukuran teks"
                        className="inline-flex rounded-lg bg-muted p-0.5"
                    >
                        {FONT_SIZE_OPTIONS.map((option) => (
                            <DropdownMenuRadioItem
                                key={option.value}
                                value={option.value}
                                onSelect={(event) => {
                                    event.preventDefault();
                                    updateFontSize(option.value);
                                }}
                                className={cn(
                                    'min-h-11 min-w-11 justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors [&>span:first-child]:hidden',
                                    fontSize === option.value
                                        ? 'bg-background text-primary shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {option.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </MenuRow>
                <MenuRow label="Warna">
                    <ColorPicker />
                </MenuRow>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                asChild
                className="px-4 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
                <Link
                    className="w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="size-4" />
                    Keluar
                </Link>
            </DropdownMenuItem>
        </>
    );
}
