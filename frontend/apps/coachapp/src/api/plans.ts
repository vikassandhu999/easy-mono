export type Plan = {
    id: string;
    name: string;
    discipline: 'nutrition' | 'workout';
    kind: 'client_copy' | 'template';
    recurrence: 'calendar' | 'daily' | 'weekly';
    allow_client_edits: string;
    client_id: string;
    created_at: string;
    created_by: string;
    description: null | string;
    duration_days: null | number;
    duration_weeks: null | number;
    end_date: null | string;
    start_date: null | string;
    status: string;
    template_id: null | string;
    timezone: null | string;
    updated_at: string;
};

export type PlansListOpts = {
    client_id?: string;
    discipline?: 'nutrition' | 'workout';
    kind?: 'client_copy' | 'template';
    page?: number;
    per_page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
    status?: 'active' | 'archived' | 'draft';
    is_template?: boolean;
};

export interface PlansList {
    page: number;
    page_size: number;
    records: Plan[];
    total: number;
}

export type CreatePlanProps = Omit<Plan, 'created_at' | 'id' | 'updated_at'> & {id?: string};

export type UpdatePlanProps = Partial<Plan> & {id: string};
