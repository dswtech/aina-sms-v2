import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function FilterPanel({
    title,
    summary,
    children,
    className,
    collapseOnMobile = false,
    iconOnly = false,
}: {
    title: string;
    summary: string;
    children: ReactNode;
    className?: string;
    collapseOnMobile?: boolean;
    iconOnly?: boolean;
}) {
    const isMobile = useIsMobile();
    const [expanded, setExpanded] = useState<boolean>();
    const open = expanded ?? !(collapseOnMobile && isMobile);

    return (
        <Collapsible open={open} onOpenChange={setExpanded} asChild>
            <section
                aria-label={title}
                className={cn(
                    'rounded-xl border bg-card px-4 py-3 sm:px-5',
                    className,
                )}
            >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <Filter aria-hidden="true" className="size-4" />
                            Filter
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {summary}
                        </p>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={
                                        iconOnly
                                            ? 'size-11 shrink-0 p-0'
                                            : 'gap-1.5 px-2'
                                    }
                                    aria-label={
                                        open
                                            ? 'Sembunyikan filter'
                                            : 'Tampilkan filter'
                                    }
                                >
                                    {open ? (
                                        <ChevronUp
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    ) : (
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    )}
                                    {!iconOnly &&
                                        (open
                                            ? 'Sembunyikan filter'
                                            : 'Tampilkan filter')}
                                </Button>
                            </CollapsibleTrigger>
                        </TooltipTrigger>
                        {iconOnly && (
                            <TooltipContent>
                                {open
                                    ? 'Sembunyikan filter'
                                    : 'Tampilkan filter'}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
                <CollapsibleContent className="pt-3">
                    {children}
                </CollapsibleContent>
            </section>
        </Collapsible>
    );
}
