import {z} from 'zod';

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

export const CreatePlan_zod = z
  .object({
    name: z
      .string()
      .min(2, 'Plan name must be at least 2 characters long')
      .max(255, 'Plan name must not exceed 255 characters')
      .transform((val) => val.trim()),
    description: z
      .string()
      .optional()
      .transform((val) => (val && val.trim()) || undefined),
    discipline: z.enum(['nutrition', 'workout']),
    kind: z.enum(['client_copy', 'template']),
    recurrence: z.enum(['calendar', 'daily', 'weekly']),
    duration_weeks: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 week')
      .max(104, 'Duration must not exceed 104 weeks')
      .optional(),
    duration_days: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 day')
      .max(730, 'Duration must not exceed 730 days')
      .optional(),
    timezone: z.string().optional(),
    status: z.enum(['active', 'archived', 'draft']).optional(),
    start_date: z.string().min(1, 'Please select a start date'),
    end_date: z.string().optional(),
    allow_client_edits: z.boolean().optional(),
    template_id: z.string().optional(),
    client_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.recurrence === 'weekly') {
        return data.duration_weeks !== undefined && data.duration_weeks >= 1 && data.duration_weeks <= 104;
      }
      return true;
    },
    {
      message: 'Weekly plans require a duration between 1 and 104 weeks',
      path: ['duration_weeks'],
    },
  )
  .refine(
    (data) => {
      if (data.recurrence === 'daily') {
        return data.duration_days !== undefined && data.duration_days >= 1 && data.duration_days <= 730;
      }
      return true;
    },
    {
      message: 'Daily plans require a duration between 1 and 730 days',
      path: ['duration_days'],
    },
  );
