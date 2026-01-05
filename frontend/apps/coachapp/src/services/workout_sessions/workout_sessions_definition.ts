import {z} from 'zod';

import {type PerformedSet, PerformedSet_zod} from '../performed_sets/performed_sets_definition';

/**
 * WorkoutSession represents an active or completed workout tracking session.
 */
export type WorkoutSession = {
  id: string;
  client_id: string;
  planned_workout_id: null | string;
  training_plan_id: null | string;
  status: 'completed' | 'discarded' | 'in_progress';
  started_at: string;
  completed_at: null | string;
  discarded_at: null | string;
  notes: null | string;
  performed_sets: PerformedSet[];
  inserted_at: string;
  updated_at: string;
};

export const WorkoutSession_zod = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  planned_workout_id: z.string().uuid().nullable(),
  training_plan_id: z.string().uuid().nullable(),
  status: z.enum(['in_progress', 'completed', 'discarded']),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  discarded_at: z.string().nullable(),
  notes: z.string().nullable(),
  performed_sets: z.array(PerformedSet_zod).optional().default([]),
  inserted_at: z.string(),
  updated_at: z.string(),
});

export type CreateWorkoutSession = {
  client_id?: string;
  planned_workout_id?: string;
  training_plan_id?: string;
  notes?: string;
};

export const CreateWorkoutSession_zod = z.object({
  client_id: z.string().uuid().optional(),
  planned_workout_id: z.string().uuid().optional(),
  training_plan_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type WorkoutSessionListOpts = {
  page?: number;
  per_page?: number;
  client_id?: string;
  status?: 'completed' | 'discarded' | 'in_progress';
  training_plan_id?: string;
};

export const WorkoutSessionListOpts_zod = z.object({
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(['in_progress', 'completed', 'discarded']).optional(),
  training_plan_id: z.string().uuid().optional(),
});

export type WorkoutSessionList = {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  records: WorkoutSession[];
};
