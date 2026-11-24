import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { TargetReminder } from '@/components/target-reminder';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip pb-16 md:pb-0 md:has-[[data-target-reminder=corner]]:pb-40"
            >
                {/* One sticky block so the banner never scrolls out of view. */}
                <div className="sticky top-0 z-30">
                    <ImpersonationBanner />
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                </div>
                <TargetReminder />
                {children}
            </AppContent>
            <MobileBottomNav />
        </AppShell>
    );
}
