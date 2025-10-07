export type PlanDiscipline = 'nutrition' | 'workout';
export type PlanKind = 'client_copy' | 'template';
export type PlanRecurrence = 'calendar' | 'daily' | 'weekly';
export type PlanStatus = 'active' | 'archived' | 'draft';

export type Plan = {
    id: string;
    name: string;
    description: null | string;
    discipline: PlanDiscipline;
    kind: PlanKind;
    recurrence: PlanRecurrence;
    duration_days: null | number;
    duration_weeks: null | number;
    timezone: null | string;
    status: PlanStatus;
    start_date: null | string;
    end_date: null | string;
    allow_client_edits: boolean;
    template_id: null | string;
    client_id: null | string;
    created_by: null | string;
    last_edited_by: null | string;
    created_at: string;
    updated_at: string;
};

export type PlansListOpts = {
    client_id?: string;
    discipline?: PlanDiscipline;
    kind?: PlanKind;
    page?: number;
    per_page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
    status?: PlanStatus;
    is_template?: boolean;
};

export interface PlansList {
    page: number;
    page_size: number;
    records: Plan[];
    total: number;
}

export type CreatePlanProps = {
    name: string;
    description?: string;
    discipline: PlanDiscipline;
    kind: PlanKind;
    recurrence: PlanRecurrence;
    duration_weeks?: number;
    duration_days?: number;
    timezone?: string;
    status?: PlanStatus;
    start_date?: string;
    end_date?: string;
    allow_client_edits?: boolean;
    template_id?: string;
    client_id?: string;
};

export type UpdatePlanProps = Partial<CreatePlanProps> & {id: string};
