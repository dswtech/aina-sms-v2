import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function FilterPanel({
    title,
    summary,
    children,
    className,
}: {
    title: string;
    summary: string;
    children: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(true);

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
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
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 px-2"
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
                            {open ? 'Sembunyikan filter' : 'Tampilkan filter'}
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="pt-3">
                    {children}
                </CollapsibleContent>
            </section>
        </Collapsible>
    );
}
