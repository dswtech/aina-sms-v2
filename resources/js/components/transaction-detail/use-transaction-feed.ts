import { useCallback, useEffect, useRef, useState } from 'react';
import { combinePages, mergeEarlier } from '@/lib/transaction-detail';
import type { HistoryPage, TimelineEvent } from '@/types/history';

type FeedState = 'idle' | 'loading' | 'error';
type Action = 'first' | 'reload' | 'earlier';

/**
 * Comments or activities of one transaction. The server pages newest first;
 * `events` reads oldest to newest and "load earlier" prepends the next page.
 * With no `initial` page the first page is fetched once `enabled` turns true.
 * `reload` refreshes every page already shown; `retry` repeats the action that failed.
 */
export function useTransactionFeed(
    publicId: string,
    kind: 'comments' | 'activities',
    initial: HistoryPage<TimelineEvent> | null,
    enabled: boolean,
) {
    const [events, setEvents] = useState<TimelineEvent[]>(() =>
        initial ? mergeEarlier([], initial.data) : [],
    );
    const [page, setPage] = useState(initial?.current_page ?? 0);
    const [lastPage, setLastPage] = useState(initial?.last_page ?? 1);
    const [state, setState] = useState<FeedState>('idle');
    // False until a page has arrived, so "nothing yet" is not shown while the first page is on its way.
    const [fetched, setFetched] = useState(initial !== null);
    const started = useRef(initial !== null);
    const request = useRef(0);
    const loaded = useRef(initial?.current_page ?? 0);
    const lastAction = useRef<Action>('first');

    const run = useCallback(
        async (action: Action) => {
            const current = ++request.current;
            lastAction.current = action;
            setState('loading');
            const get = async (n: number) => {
                const response = await fetch(
                    `/transactions/${publicId}/feed?kind=${kind}&page=${n}`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!response.ok) throw new Error('feed');

                return (await response.json()) as HistoryPage<TimelineEvent>;
            };
            try {
                if (action === 'earlier') {
                    const body = await get(loaded.current + 1);
                    if (current !== request.current) return;
                    setEvents((shown) => mergeEarlier(shown, body.data));
                    loaded.current = body.current_page;
                    setPage(body.current_page);
                    setLastPage(body.last_page);
                } else {
                    const count = Math.max(loaded.current, 1);
                    const bodies = await Promise.all(
                        Array.from({ length: count }, (_, i) => get(i + 1)),
                    );
                    if (current !== request.current) return;
                    setEvents(combinePages(bodies.map((body) => body.data)));
                    loaded.current = count;
                    setPage(count);
                    setLastPage(bodies[0].last_page);
                }
                setFetched(true);
                setState('idle');
            } catch {
                if (current === request.current) setState('error');
            }
        },
        [publicId, kind],
    );

    useEffect(() => {
        if (!enabled || started.current) return;
        started.current = true;
        void run('first');
    }, [enabled, run]);

    return {
        events,
        state,
        fetched,
        hasEarlier: page > 0 && page < lastPage,
        loadEarlier: () => void run('earlier'),
        reload: () => void run('reload'),
        retry: () => void run(lastAction.current),
    };
}
