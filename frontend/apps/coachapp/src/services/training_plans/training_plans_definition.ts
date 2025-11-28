import {z} from 'zod';

export type TrainingPlan = {
    id: string;
    name: string;
    description: null | string;
    is_template: boolean;
    duration_weeks: number;
    business_id: string;
    author_id: string;
    client_id: null | string;
    original_template_id: null | string;
    workouts: PlannedWorkout[];
    inserted_at?: string;
    updated_at?: string;
};

export type PlannedWorkout = {
    id: string;
    name: string;
    notes: null | string;
    day_number: number;
    elements: WorkoutElement[];
};

export type WorkoutElement = {
    id: string;
    position: number;
    superset_group_id: null | string;
    notes: null | string;
    exercise_id: string;
    exercise: Exercise | null;
    sets: PlannedSet[];
};

export type Exercise = {
    id: string;
    name: string;
    description: null | string;
};

export type PlannedSet = {
    id: string;
    position: number;
    reps_min: null | number;
    reps_max: null | number;
    load_value: null | number;
    load_type: null | string;
    rest_seconds: null | number;
};

export type TrainingPlansListOpts = {
    page?: number;
    per_page?: number;
    search?: string;
    is_template?: boolean;
    client_id?: string;
};

export interface TrainingPlansList {
    meta: {
        offset: number;
        limit: number;
        total: number;
    };
    records: TrainingPlan[];
}

// Zod schemas

export const PlannedSet_zod = z.object({
    position: z.number(),
    reps_min: z.number().nullable().optional(),
    reps_max: z.number().nullable().optional(),
    load_value: z.number().nullable().optional(),
    load_type: z.string().nullable().optional(),
    rest_seconds: z.number().nullable().optional(),
});

export const WorkoutElement_zod = z.object({
    position: z.number(),
    superset_group_id: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    exercise_id: z.string(),
    sets: z.array(PlannedSet_zod).optional(),
});

export const PlannedWorkout_zod = z.object({
    name: z.string().min(1, 'Workout name is required'),
    notes: z.string().nullable().optional(),
    day_number: z.number().min(1, 'Day number must be at least 1'),
    elements: z.array(WorkoutElement_zod).optional(),
});

export const CreateTrainingPlan_zod = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),
    description: z.string().optional().default(''),
    is_template: z.boolean().default(true),
    duration_weeks: z.number().int().min(1, 'Duration must be at least 1 week'),
    workouts: z.array(PlannedWorkout_zod).optional(),
});

export type CreateTrainingPlan = z.infer<typeof CreateTrainingPlan_zod>;
export type UpdateTrainingPlan = Partial<CreateTrainingPlan> & {id: string};
