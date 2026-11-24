export type TargetReminderTeam = {
    id: string;
    name: string;
    reason: 'missing_target' | 'unallocated_sales';
    unallocated_count: number;
};

export type TargetReminder = {
    today: string;
    period: string;
    teams: TargetReminderTeam[];
};

const key = (userId: string) => `target-reminder-dismissed:${userId}`;
// Keeps a dismissal for this session when the browser blocks storage.
const dismissed = new Map<string, string>();

type Store = Pick<Storage, 'getItem' | 'setItem'>;

// Deferred because reading `window.localStorage` itself can throw.
export function browserStore(): Store {
    return {
        getItem: (name) => window.localStorage.getItem(name),
        setItem: (name, value) => window.localStorage.setItem(name, value),
    };
}

export function isDismissed(
    storage: Store,
    userId: string,
    today: string,
): boolean {
    if (dismissed.get(userId) === today) return true;
    try {
        return storage.getItem(key(userId)) === today;
    } catch {
        return false;
    }
}

export function dismiss(storage: Store, userId: string, today: string): void {
    dismissed.set(userId, today);
    try {
        storage.setItem(key(userId), today);
    } catch {
        // The in-memory copy above still hides it for this session.
    }
}

export function reminderMessage(teams: TargetReminderTeam[]): string {
    return teams
        .map((team) =>
            team.reason === 'missing_target'
                ? `Target ${team.name} bulan ini belum diisi.`
                : `${team.unallocated_count} Sales di ${team.name} belum mendapat target bulan ini.`,
        )
        .join(' ');
}
