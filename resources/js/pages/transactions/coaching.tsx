import { Head, Link, router, usePage } from '@inertiajs/react';
import { MessagesSquare, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Conversation } from '@/components/coaching/conversation';
import type {
    ConversationSummary,
    OpenConversation,
} from '@/components/coaching/conversation';
import { StageBadge } from '@/components/stage-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime } from '@/lib/notifications';
import { financingParts } from '@/lib/transaction-labels';
import { cn } from '@/lib/utils';
import type { HistoryPage, TimelineEvent } from '@/types/history';

type Status = 'supervisor' | 'sales' | 'done';
type Row = ConversationSummary & {
    status: Status;
    author_name: string | null;
    excerpt: string;
    commented_at: string | null;
};
type Props = {
    conversations: {
        data: Row[];
        current_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    counts: { supervisor: number; sales: number };
    tab: Status;
    search: string;
    transaction: OpenConversation | null;
    timeline: HistoryPage<TimelineEvent> | null;
};

export default function Coaching({
    conversations,
    counts,
    tab,
    search,
    transaction,
    timeline,
}: Props) {
    const { auth } = usePage().props;
    const { role } = auth.user;
    const getInitials = useInitials();
    const [term, setTerm] = useState(search);
    const audit = role === 'admin';
    const tabs: [Status, string][] =
        role === 'sales'
            ? [
                  ['sales', 'Perlu dibalas'],
                  ['supervisor', 'Menunggu'],
                  ['done', 'Selesai'],
              ]
            : [
                  ['supervisor', audit ? 'Supervisor' : 'Perlu dibalas'],
                  ['sales', audit ? 'Sales' : 'Menunggu'],
                  ['done', 'Selesai'],
              ];
    const tabNames = Object.fromEntries(tabs);
    const caption = search
        ? `Hasil pencarian "${search}" di semua status`
        : tab === 'done'
          ? 'Sudah ditandai selesai'
          : `Menunggu balasan ${tab === role ? 'Anda' : tab === 'sales' ? 'Sales' : 'Supervisor'}`;

    const here = transaction
        ? `/transactions/${transaction.public_id}/coaching`
        : '/coaching';
    const href = (
        path: string,
        query: { tab?: Status; search?: string; page?: number },
    ) =>
        `${path}?${new URLSearchParams({
            tab: query.tab ?? tab,
            ...(query.search ? { search: query.search } : {}),
            ...(query.page && query.page > 1
                ? { page: String(query.page) }
                : {}),
        })}`;

    // A slow answer to this page's own search must not overwrite newer typing; Back and tabs do reset it.
    const sentSearch = useRef(search);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
        if (search === sentSearch.current) return;
        sentSearch.current = search;
        setTerm(search);
    }, [search]);
    // `here` restarts the timer, so a pending search never reopens the previous conversation.
    useEffect(() => {
        const next = term.trim();
        if (next === sentSearch.current) return;
        searchTimer.current = setTimeout(() => {
            sentSearch.current = next;
            router.get(
                href(here, { search: next }),
                {},
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(searchTimer.current);
    }, [term, here]);

    return (
        <>
            <Head title="Coaching" />
            <h1 className="sr-only">Coaching</h1>
            {/* Container query, not viewport: the open sidebar leaves a tablet no room for two panes. */}
            <div className="@container mx-auto flex h-[calc(100dvh-8rem)] min-h-[30rem] w-full max-w-screen-2xl min-w-0 md:h-[calc(100dvh-4rem)]">
                <section
                    aria-labelledby="conversation-list-title"
                    className={cn(
                        'flex min-h-0 w-full min-w-0 flex-col @2xl:w-72 @2xl:shrink-0 @2xl:border-r @5xl:w-80',
                        transaction && '@max-2xl:hidden',
                    )}
                >
                    <div className="space-y-3 border-b p-4">
                        <h2
                            id="conversation-list-title"
                            className="text-lg font-semibold"
                        >
                            Percakapan
                        </h2>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="coaching-search"
                                className="text-xs"
                            >
                                Cari percakapan
                            </Label>
                            <div className="relative">
                                <Search
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    id="coaching-search"
                                    type="search"
                                    maxLength={100}
                                    value={term}
                                    onChange={(event) =>
                                        setTerm(event.target.value)
                                    }
                                    placeholder="Nama pelanggan atau kendaraan"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <nav
                            aria-label="Status percakapan"
                            className="flex rounded-lg bg-muted p-1"
                        >
                            {tabs.map(([key, name]) => {
                                const current = !search && tab === key;

                                return (
                                    <Link
                                        key={key}
                                        href={href(here, { tab: key })}
                                        onClick={() => {
                                            clearTimeout(searchTimer.current);
                                            sentSearch.current = '';
                                            setTerm('');
                                        }}
                                        preserveState
                                        preserveScroll
                                        aria-current={
                                            current ? 'page' : undefined
                                        }
                                        className={cn(
                                            'inline-flex min-h-8 flex-auto items-center justify-center gap-1 rounded-md px-1.5 text-xs whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11',
                                            current &&
                                                'bg-background font-medium text-foreground',
                                        )}
                                    >
                                        {name}
                                        {key !== 'done' && (
                                            <span className="tabular-nums">
                                                {counts[key]}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <p
                        role="status"
                        className="border-b px-4 py-2 text-xs [overflow-wrap:anywhere] text-muted-foreground"
                    >
                        {caption}
                    </p>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {conversations.data.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                {search
                                    ? 'Tidak ada percakapan yang cocok.'
                                    : 'Tidak ada percakapan di sini.'}
                            </p>
                        ) : (
                            <ul>
                                {conversations.data.map((row) => {
                                    const selected =
                                        row.public_id ===
                                        transaction?.public_id;
                                    const financing = row.financing.type
                                        ? financingParts(row).main
                                        : 'Pembiayaan belum ditentukan';

                                    return (
                                        <li
                                            key={row.public_id}
                                            className="border-b"
                                        >
                                            <Link
                                                href={href(
                                                    `/transactions/${row.public_id}/coaching`,
                                                    {
                                                        search,
                                                        page: conversations.current_page,
                                                    },
                                                )}
                                                // A pending search must not cancel this visit; it resumes after it.
                                                onClick={() =>
                                                    clearTimeout(
                                                        searchTimer.current,
                                                    )
                                                }
                                                preserveState
                                                preserveScroll
                                                aria-current={
                                                    selected
                                                        ? 'true'
                                                        : undefined
                                                }
                                                className={cn(
                                                    'flex min-w-0 gap-3 border-l-2 border-l-transparent px-3.5 py-3 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                                                    selected &&
                                                        'border-l-primary bg-muted hover:bg-muted',
                                                )}
                                            >
                                                <Avatar
                                                    aria-hidden
                                                    className="size-9"
                                                >
                                                    <AvatarFallback className="bg-background text-xs font-medium text-foreground">
                                                        {getInitials(
                                                            row.customer_name ??
                                                                '',
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline justify-between gap-2">
                                                        <span className="truncate text-sm font-medium">
                                                            {row.customer_name ??
                                                                'Pelanggan'}
                                                        </span>
                                                        <time
                                                            dateTime={
                                                                row.commented_at ??
                                                                undefined
                                                            }
                                                            className="shrink-0 text-xs text-muted-foreground"
                                                        >
                                                            {formatRelativeTime(
                                                                row.commented_at,
                                                            )}
                                                        </time>
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {[
                                                            row.vehicle_model ??
                                                                'Kendaraan belum ditentukan',
                                                            role === 'sales'
                                                                ? null
                                                                : row.sales_name,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                    <span className="mt-1 block truncate text-sm">
                                                        {row.author_name?.split(
                                                            ' ',
                                                        )[0] ?? 'Pengguna'}
                                                        : {row.excerpt}
                                                    </span>
                                                    <span className="mt-1.5 flex min-w-0 items-center gap-2">
                                                        <StageBadge
                                                            stage={
                                                                row.stage_label
                                                            }
                                                            className="shrink-0"
                                                        >
                                                            {row.stage_label}
                                                        </StageBadge>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {search
                                                                ? tabNames[
                                                                      row.status
                                                                  ]
                                                                : financing}
                                                        </span>
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    {(conversations.prev_page_url ||
                        conversations.next_page_url) && (
                        <nav
                            aria-label="Halaman percakapan"
                            className="flex justify-between gap-2 border-t p-3"
                        >
                            {(
                                [
                                    ['Sebelumnya', conversations.prev_page_url],
                                    ['Berikutnya', conversations.next_page_url],
                                ] as const
                            ).map(([label, url]) => (
                                <Button
                                    key={label}
                                    type="button"
                                    variant="outline"
                                    disabled={!url}
                                    onClick={() =>
                                        url &&
                                        router.get(
                                            url,
                                            {},
                                            { preserveState: true },
                                        )
                                    }
                                >
                                    {label}
                                </Button>
                            ))}
                        </nav>
                    )}
                </section>
                {transaction && timeline ? (
                    <Conversation
                        key={transaction.public_id}
                        transaction={transaction}
                        timeline={timeline}
                        backHref={href('/coaching', { search })}
                    />
                ) : (
                    <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center @2xl:flex">
                        <MessagesSquare
                            aria-hidden
                            className="mb-1 size-7 text-muted-foreground"
                        />
                        <p className="text-sm font-medium">Pilih percakapan</p>
                        <p className="text-xs text-muted-foreground">
                            Percakapan baru dimulai dari komentar di detail
                            transaksi.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

Coaching.layout = {
    breadcrumbs: [{ title: 'Coaching', href: '/coaching' }],
};
