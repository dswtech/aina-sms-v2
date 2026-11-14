import type { CustomerProfile } from '@/lib/customer-profile';
import type { Area } from '@/lib/transaction-labels';

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
    vehicle_model: string | null;
    current_stage: string;
    stage_label: string;
    is_closed: boolean;
    can_record_do: boolean;
    stage_event_id: number | null;
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

/** JSON of GET /transactions/{public_id} used by the detail modal. */
export type TransactionDetailData = {
    public_id: string;
    vehicle_model: string | null;
    source: string;
    source_channel: string | null;
    notes: string | null;
    current_stage: string;
    stage_label: string;
    estimated_value: number | null;
    expected_closing_month: string | null;
    customer: {
        public_id: string | null;
        contact_channel_preference: string | null;
        opt_out: boolean;
        last_contact_at: string | null;
        assigned_sales: { id: number; name: string } | null;
        next_follow_up: {
            id: number;
            scheduled_at: string;
            plan_notes: string;
        } | null;
        name: string;
        phone: string;
        social_media_account: string | null;
        email: string | null;
        address: string | null;
        gender: string | null;
        birth_date: string | null;
        occupation: string | null;
        area: {
            region_code: string | null;
            district_code: string | null;
            other_city: string | null;
        };
    };
    sales: { name: string; username: string } | null;
    supervisors: { id: number; name: string }[];
    area: Area;
    financing: {
        type: string | null;
        leasing_id: number | null;
        other_name: string | null;
        leasing_name?: string | null;
        tenor_months?: number | null;
        insurance_type?: string | null;
    };
    deal_id: number;
    progress_at: string | null;
    customer_profile: CustomerProfile | null;
    can_edit_metadata: boolean;
    can_edit_customer: boolean;
    can_assign_customer: boolean;
    can_update: boolean;
    can_record_do: boolean;
    can_confirm_delivery: boolean;
    can_cancel_do: boolean;
    do_event_id: number | null;
    stage_event_id: number | null;
    can_comment: boolean;
    days_in_stage: number | null;
    stages: HistoryPage<TimelineEvent> | null;
    comments: HistoryPage<TimelineEvent> | null;
};
