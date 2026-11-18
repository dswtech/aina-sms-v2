import { Head, usePage } from '@inertiajs/react';
import { formatReleaseDate } from '@/lib/releases';

type Release = { version: string; date: string; items: string[] };

export default function ReleasesIndex({ releases }: { releases: Release[] }) {
    const { appVersion } = usePage().props;

    return (
        <>
            <Head title="Riwayat Rilis" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
                        Riwayat Rilis
                    </h1>
                    <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                        Versi sekarang: v{appVersion}
                    </p>
                </div>

                <ol className="mt-10 max-w-2xl space-y-4">
                    {releases.map((release) => (
                        <li
                            key={release.version}
                            className="rounded-xl border bg-card px-4 py-4"
                        >
                            <h2 className="text-base font-semibold">
                                v{release.version}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    {formatReleaseDate(release.date)}
                                </span>
                            </h2>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                                {release.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
            </div>
        </>
    );
}
