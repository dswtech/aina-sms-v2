import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';
import { isNavigationItemActive } from '@/lib/navigation';

function NavigationGroup({
    item,
    active,
    url,
}: {
    item: NavItem;
    active: boolean;
    url: string;
}) {
    const [open, setOpen] = useState(active);
    const { state, setOpen: setSidebarOpen } = useSidebar();
    return (
        <Collapsible
            asChild
            open={open}
            onOpenChange={(next) => {
                if (state === 'collapsed') {
                    setSidebarOpen(true);
                    setOpen(true);
                } else setOpen(next);
            }}
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        isActive={active}
                        tooltip={{ children: item.title }}
                        className="h-10 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                        {item.icon && <item.icon aria-hidden="true" />}
                        <span>{item.title}</span>
                        <ChevronRight
                            aria-hidden="true"
                            className={`ml-auto transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.children?.map((child) => {
                            const selected = isNavigationItemActive(child, url);
                            return (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={selected}
                                        className="min-h-11"
                                    >
                                        <Link
                                            href={child.href}
                                            aria-current={
                                                selected ? 'page' : undefined
                                            }
                                            prefetch
                                        >
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            );
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { url } = usePage();

    return (
        <SidebarGroup className="px-2 py-4">
            <SidebarGroupLabel>Ruang kerja</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.children?.length ? (
                        <NavigationGroup
                            key={`${item.title}:${isCurrentUrl(item.href)}`}
                            item={item}
                            active={isCurrentUrl(item.href)}
                            url={url}
                        />
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                                className="h-10 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
