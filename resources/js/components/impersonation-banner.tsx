import { Form, usePage } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { roleLabels } from '@/lib/navigation';
import type { Auth } from '@/types';

export function ImpersonationBanner() {
    const { auth } = usePage<{ auth: Auth }>().props;

    if (!auth.impersonator) {
        return null;
    }

    return (
        <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
            <Eye className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
                Anda login sebagai <strong>{auth.user.name}</strong> (
                {roleLabels[auth.user.role]}) · mode lihat saja
            </span>
            <Form action="/impersonation/stop" method="post">
                {({ processing }) => (
                    <Button size="sm" variant="outline" disabled={processing}>
                        {processing && <Spinner />}
                        Kembali ke Admin
                    </Button>
                )}
            </Form>
        </div>
    );
}
