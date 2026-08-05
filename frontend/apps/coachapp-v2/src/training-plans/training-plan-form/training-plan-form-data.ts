import {z} from 'zod';
import {omitUndefined, toNullableText, toOptionalText} from '../../api/shared.ts';
import type {TrainingPlan} from '../../api/training-plan-builder.ts';
import type {TrainingPlanCreateRequest, TrainingPlanUpdateRequest} from '../../api/training-plans-list.ts';

export const trainingPlanFormSchema = z.object({
  description: z.string().max(5000, 'Use 5000 characters or fewer').optional(),
  name: z.string().trim().min(1, 'Enter plan name').max(255, 'Use 255 characters or fewer'),
});

export type TrainingPlanFormValues = z.infer<typeof trainingPlanFormSchema>;

export const TRAINING_PLAN_FORM_DEFAULTS: TrainingPlanFormValues = {
  description: '',
  name: '',
};

export function trainingPlanToFormValues(plan: TrainingPlan): TrainingPlanFormValues {
  return {
    description: plan.description ?? '',
    name: plan.name,
  };
}

export function trainingPlanToCreateRequest(values: TrainingPlanFormValues): TrainingPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
  });
}

export function trainingPlanToUpdateRequest(values: TrainingPlanFormValues): TrainingPlanUpdateRequest {
  return {
    name: values.name,
    description: toNullableText(values.description),
  };
}
