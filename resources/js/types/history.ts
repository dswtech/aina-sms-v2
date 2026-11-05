export type HistoryPage<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
};
export type TimelineComment = {
    id: number;
    body: string;
    author_name: string | null;
    created_at: string | null;
    edited_at: string | null;
    stage_at_creation?: string | null;
    stage_at_creation_label: string | null;
    can_edit: boolean;
    parent_id: number | null;
    parent_body: string | null;
    parent_author_name: string | null;
    revisions?: {
        id: number;
        old_body: string;
        edited_at: string;
        editor_name: string | null;
    }[];
};
export type TimelineEvent = {
    key: string;
    kind: 'stage' | 'activity' | 'comment';
    occurred_at: string;
    actor_name: string | null;
    body: string | null;
    label: string;
    comment?: TimelineComment;
};
export type HistoryTransaction = {
    id: number;
    public_id: string;
    vehicle_model: string;
    current_stage: string;
    stage_label: string;
    is_closed: boolean;
    is_stagnant: boolean;
    estimated_value: number | null;
    expected_closing_month: string | null;
    can_comment: boolean;
    comments: [];
};
export type RelationshipActivity = {
    id: number;
    type: string;
    type_label: string;
    notes: string;
    occurred_at: string;
    user_name: string | null;
};
export type CustomerHistoryData = {
    transactions: HistoryTransaction[];
    selected_transaction: HistoryTransaction | null;
    activities: HistoryPage<RelationshipActivity>;
    timeline: HistoryPage<TimelineEvent>;
};
