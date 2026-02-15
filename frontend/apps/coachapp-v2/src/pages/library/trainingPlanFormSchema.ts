import {z} from 'zod';

import type {TrainingPlan} from '@/api/trainingPlans';
import type {TrainingPlanFormValues} from '@/pages/library/trainingPlanFormTypes';

export const TRAINING_PLAN_FORM_SCHEMA = z
  .object({
    client_id: z.string(),
    description: z.string(),
    end_date: z.string(),
    is_template: z.boolean(),
    name: z.string().trim().min(1, 'Plan name is required.'),
    start_date: z.string(),
    status: z.enum(['draft', 'active', 'archived']),
  })
  .superRefine((values, ctx) => {
    if (values.is_template) {
      return;
    }

    if (!values.client_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client is required for personal plans.',
        path: ['client_id'],
      });
    }

    if (values.start_date && values.end_date && values.start_date > values.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date.',
        path: ['end_date'],
      });
    }
  });

export const TRAINING_PLAN_INITIAL_VALUES: TrainingPlanFormValues = {
  client_id: '',
  description: '',
  end_date: '',
  is_template: true,
  name: '',
  start_date: '',
  status: 'draft',
};

export const mapTrainingPlanToFormValues = (plan: TrainingPlan): TrainingPlanFormValues => ({
  client_id: plan.client_id ?? '',
  description: plan.description ?? '',
  end_date: plan.end_date ?? '',
  is_template: plan.is_template,
  name: plan.name,
  start_date: plan.start_date ?? '',
  status: plan.status === 'active' || plan.status === 'archived' ? plan.status : 'draft',
});
