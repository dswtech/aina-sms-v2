import { IconSelector } from '@tabler/icons-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn NativeSelect (Mira) with the project's 44px touch height; className styles the wrapper.
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
    return (
        <div
            className={cn(
                'group/native-select relative w-full has-[select:disabled]:opacity-50',
                className,
            )}
            data-slot="native-select-wrapper"
        >
            <select
                data-slot="native-select"
                className="h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-input/20 py-1 pr-9 pl-3 text-base transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                {...props}
            />
            <IconSelector
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground select-none"
                aria-hidden="true"
                data-slot="native-select-icon"
            />
        </div>
    );
}

export { NativeSelect };
