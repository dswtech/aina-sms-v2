import { Link, usePage } from '@inertiajs/react';
import { Target, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    browserStore,
    dismiss,
    isDismissed,
    reminderMessage,
} from '@/lib/target-reminder';

/** In the page flow on phones and on the dashboard (where it would cover the numbers), else a corner card from md up. Never modal: it takes no focus and has no overlay. */
export function TargetReminder() {
    const { url, props } = usePage();
    const { targetReminder: reminder, auth } = props;
    const [, refresh] = useState(0);

    const { pathname } = new URL(url, 'http://localhost');
    const inFlow = pathname === '/dashboard';
    if (
        !reminder ||
        pathname === '/targets/plans' ||
        isDismissed(browserStore(), auth.user.public_id, reminder.today)
    )
        return null;

    const close = () => {
        dismiss(browserStore(), auth.user.public_id, reminder.today);
        refresh((count) => count + 1);
    };

    const card = (
        <div
            role="status"
            data-target-reminder={inFlow ? 'flow' : 'corner'}
            className={`mt-4 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-card-foreground ${inFlow ? '' : 'mx-5 sm:mx-8 md:fixed md:right-6 md:bottom-6 md:z-20 md:m-0 md:max-w-sm md:shadow-lg'}`}
        >
            <Target
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div className="min-w-0 flex-1">
                <p className="leading-6 break-words">
                    {reminderMessage(reminder.teams)}
                </p>
                <Button asChild variant="outline" className="mt-3 min-h-11">
                    <Link href="/targets/plans" onClick={close}>
                        Isi target
                    </Link>
                </Button>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mt-2 -mr-2 size-11 shrink-0"
                aria-label="Tutup pengingat target"
                onClick={close}
            >
                <X aria-hidden="true" />
            </Button>
        </div>
    );
    return inFlow ? (
        <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8 lg:px-10">
            {card}
        </div>
    ) : (
        card
    );
}
