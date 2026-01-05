import {z} from 'zod';

export type ExerciseMechanics = 'compound' | 'isolation' | 'isometric';
export type ExerciseForce = 'pull' | 'push' | 'static';

export type Muscle = {
  id: string;
  name: string;
};

export type Equipment = {
  id: string;
  name: string;
};

export type Exercise = {
  id: string;
  name: string;
  description: null | string;
  instructions: null | string;
  // slug field removed per migration guide - use id for lookups
  mechanics: ExerciseMechanics | null; // Now nullable
  force: ExerciseForce | null; // Now nullable
  business_id: null | string; // null = system exercise
  muscles: Muscle[];
  equipment: Equipment[];
  images: string[]; // Array of image URLs for the exercise
  inserted_at?: string;
  updated_at?: string;
};

/**
 * Check if an exercise is a system-level exercise (not owned by any business).
 * System exercises cannot be edited or deleted, only duplicated.
 */
export const isSystemExercise = (exercise: Exercise): boolean => {
  return exercise.business_id === null;
};

export type ExercisesListOpts = {
  page?: number;
  per_page?: number;
  search?: string;
  muscle_ids?: string[];
};

export interface ExercisesList {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  records: Exercise[];
}

// Zod schemas

export const CreateExercise_zod = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  mechanics: z.enum(['compound', 'isolation', 'isometric']).optional(),
  force: z.enum(['pull', 'push', 'static']).optional(),
  muscle_ids: z.array(z.string()).optional(),
  equipment_ids: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(), // Array of image URLs
});

export type CreateExercise = z.infer<typeof CreateExercise_zod>;
export type UpdateExercise = Partial<CreateExercise> & {id: string};
