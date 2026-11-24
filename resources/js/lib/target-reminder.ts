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
