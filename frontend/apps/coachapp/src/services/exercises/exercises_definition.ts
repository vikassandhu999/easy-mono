import {z} from 'zod';

export type ExerciseMechanics = 'compound' | 'isolation' | 'isometric';
export type ExerciseForce = 'pull' | 'push' | 'static';

export type Muscle = {
    id: string;
    name: string;
    group: null | string;
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
    slug: string;
    mechanics: ExerciseMechanics | null;
    force: ExerciseForce | null;
    business_id: null | string;
    muscles: Muscle[];
    equipment: Equipment[];
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
});

export type CreateExercise = z.infer<typeof CreateExercise_zod>;
export type UpdateExercise = Partial<CreateExercise> & {id: string};
