import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const stageColors: Record<string, string> = {
    lead: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    prospect:
        'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
    hot_prospect:
        'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    spk: 'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
    do: 'border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    delivery:
        'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    lost: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-[#60434d] dark:bg-[#30252c] dark:text-[#dfb7c2]',
};

export function StageBadge({
    stage,
    children,
    className,
}: {
    stage: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(
                stageColors[stage.toLowerCase().replaceAll(' ', '_')],
                className,
            )}
        >
            {children}
        </Badge>
    );
}
