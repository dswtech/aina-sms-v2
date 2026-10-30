import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-sidebar p-5 sm:p-8">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-3 self-center rounded-lg px-2 py-1 font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <AppLogoIcon className="size-5" />
                    </div>
                    <span>DealDrive Supervisor</span>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl shadow-none">
                        <CardHeader className="px-6 pt-7 pb-0 text-left sm:px-8 sm:pt-8">
                            <CardTitle className="text-xl tracking-[-0.02em]">
                                {title}
                            </CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 py-7 sm:px-8 sm:py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
