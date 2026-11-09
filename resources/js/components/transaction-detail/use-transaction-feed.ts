import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeEarlier } from '@/lib/transaction-detail';
import type { HistoryPage, TimelineEvent } from '@/types/history';

type FeedState = 'idle' | 'loading' | 'error';

/**
 * Comments or activities of one transaction. The server pages newest first;
 * `events` reads oldest to newest and "load earlier" prepends the next page.
 * With no `initial` page the first page is fetched once `enabled` turns true.
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
    const started = useRef(initial !== null);
    const request = useRef(0);

    const fetchPage = useCallback(
        async (target: number, replace: boolean) => {
            const current = ++request.current;
            setState('loading');
            try {
                const response = await fetch(
                    `/transactions/${publicId}/feed?kind=${kind}&page=${target}`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!response.ok) throw new Error('feed');
                const body: HistoryPage<TimelineEvent> = await response.json();
                if (current !== request.current) return;
                setEvents((shown) =>
                    mergeEarlier(replace ? [] : shown, body.data),
                );
                setPage(body.current_page);
                setLastPage(body.last_page);
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
        void fetchPage(1, true);
    }, [enabled, fetchPage]);

    return {
        events,
        state,
        hasEarlier: page > 0 && page < lastPage,
        loadEarlier: () => void fetchPage(page + 1, false),
        reload: () => void fetchPage(1, true),
    };
}
