import {z} from 'zod';

// Enum types for PerformedSet
export type LoadUnit = 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm';
export type DistanceUnit = 'km' | 'meters' | 'miles' | 'none' | 'yards';

// Zod enums
export const LoadUnit_zod = z.enum(['kg', 'lbs', 'bodyweight', 'percent_1rm', 'none']);
export const DistanceUnit_zod = z.enum(['meters', 'km', 'miles', 'yards', 'none']);

/**
 * PerformedSet represents an actual set performed during a workout session.
 * At least one of actual_reps, duration_seconds, or distance_value is required.
 */
export type PerformedSet = {
  id: string;
  position: number;

  // Actual Performance (at least one required)
  actual_reps: null | string; // "10", "AMRAP:15"
  duration_seconds: null | number;
  distance_value: null | number;
  distance_unit: DistanceUnit;

  // Load
  load_value: null | number;
  load_unit: LoadUnit;

  // Intensity
  intensity_felt: null | string; // "RPE 8.5", "Zone 3"
  rpe: null | number; // 1.0-10.0
  rir: null | number; // Reps in reserve (0+)

  // Execution
  tempo_actual: null | string;
  completed: boolean;

  // Notes
  notes: null | string;

  // Relationships
  workout_session_id: string;
  exercise_id: string;

  // Timestamps
  inserted_at: string;
  updated_at: string;
};

export const PerformedSet_zod = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(0),

  // Actual Performance (at least one required)
  actual_reps: z.string().nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  distance_value: z.number().nullable().optional(),
  distance_unit: DistanceUnit_zod.optional().default('none'),

  // Load
  load_value: z.number().nullable().optional(),
  load_unit: LoadUnit_zod.optional().default('none'),

  // Intensity
  intensity_felt: z.string().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).nullable().optional(),

  // Execution
  tempo_actual: z.string().nullable().optional(),
  completed: z.boolean().optional().default(true),

  // Notes
  notes: z.string().nullable().optional(),

  // Relationships
  workout_session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
});

export type CreatePerformedSet = {
  workout_session_id: string;
  exercise_id: string;
  position: number;

  // At least one of these is required
  actual_reps?: null | string;
  duration_seconds?: null | number;
  distance_value?: null | number;
  distance_unit?: DistanceUnit;

  // Optional fields
  load_value?: null | number;
  load_unit?: LoadUnit;
  intensity_felt?: null | string;
  rpe?: null | number;
  rir?: null | number;
  tempo_actual?: null | string;
  completed?: boolean;
  notes?: null | string;
};

export const CreatePerformedSet_zod = z.object({
  workout_session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  position: z.number().int().min(0),

  actual_reps: z.string().nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  distance_value: z.number().nullable().optional(),
  distance_unit: DistanceUnit_zod.optional(),

  load_value: z.number().nullable().optional(),
  load_unit: LoadUnit_zod.optional(),
  intensity_felt: z.string().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).nullable().optional(),
  tempo_actual: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdatePerformedSet = Partial<Omit<CreatePerformedSet, 'exercise_id' | 'workout_session_id'>> & {
  id: string;
};

export const UpdatePerformedSet_zod = CreatePerformedSet_zod.partial().extend({
  id: z.string().uuid(),
});
