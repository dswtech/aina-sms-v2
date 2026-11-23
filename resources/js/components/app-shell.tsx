import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    // Tablets start with the icon rail (DESIGN.md); the toggle still expands it.
    // shortcut: read once on load, so resizing across 1024px keeps the current state until the next visit.
    const tablet =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 1023px)').matches;

    return (
        <SidebarProvider defaultOpen={isOpen && !tablet}>
            {children}
        </SidebarProvider>
    );
}
