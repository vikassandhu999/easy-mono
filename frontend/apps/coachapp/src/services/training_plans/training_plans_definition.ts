import {z} from 'zod';

// Enum types for PlannedSet
export type LoadType = 'absolute_kg' | 'absolute_lbs' | 'bodyweight' | 'none' | 'percent_1rm' | 'rpe';
export type DistanceUnit = 'km' | 'meters' | 'miles' | 'none' | 'yards';
export type SetType = 'amrap' | 'backoff' | 'cluster' | 'dropset' | 'emom' | 'rest_pause' | 'warmup' | 'working';

// Day of week types for weekly schedule model
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DayName = 'Friday' | 'Monday' | 'Saturday' | 'Sunday' | 'Thursday' | 'Tuesday' | 'Wednesday';

export const WEEKDAY_NAMES: Record<DayOfWeek, DayName> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
};

export const WEEKDAYS: Array<{value: DayOfWeek; label: DayName}> = [
    {value: 1, label: 'Monday'},
    {value: 2, label: 'Tuesday'},
    {value: 3, label: 'Wednesday'},
    {value: 4, label: 'Thursday'},
    {value: 5, label: 'Friday'},
    {value: 6, label: 'Saturday'},
    {value: 7, label: 'Sunday'},
];

export type TrainingPlan = {
    id: string;
    name: string;
    description: null | string;
    is_template: boolean;
    start_date: null | string; // ISO 8601 date (YYYY-MM-DD), null for templates
    end_date: null | string; // ISO 8601 date (YYYY-MM-DD), null for templates
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
    day_number: DayOfWeek; // 1-7 representing Monday-Sunday
    day_name: DayName; // Human-readable day name
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
    images?: string[]; // Array of image URLs for the exercise
};

export type PlannedSet = {
    // Primary Target (at least one required)
    target_reps: null | string; // "10", "8-12", "AMRAP"
    duration_seconds: null | number;
    distance_value: null | number;
    distance_unit: DistanceUnit; // Required if distance_value set

    // Load
    load_value: null | number;
    load_type: LoadType;

    // Intensity
    intensity_target: null | string; // "RPE 8", "Zone 2"

    // Execution
    tempo: null | string; // "3010"
    rest_seconds: null | number;

    // Classification
    set_type: SetType;

    // Notes
    notes: null | string;
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

// Zod enums for PlannedSet
export const LoadType_zod = z.enum(['absolute_kg', 'absolute_lbs', 'bodyweight', 'percent_1rm', 'rpe', 'none']);
export const DistanceUnit_zod = z.enum(['meters', 'km', 'miles', 'yards', 'none']);
export const SetType_zod = z.enum([
    'warmup',
    'working',
    'dropset',
    'backoff',
    'amrap',
    'emom',
    'cluster',
    'rest_pause',
]);

export const PlannedSet_zod = z.object({
    // Primary Target (at least one required)
    target_reps: z.string().nullable().optional(),
    duration_seconds: z.number().nullable().optional(),
    distance_value: z.number().nullable().optional(),
    distance_unit: DistanceUnit_zod.optional().default('none'),

    // Load
    load_value: z.number().nullable().optional(),
    load_type: LoadType_zod.optional().default('none'),

    // Intensity
    intensity_target: z.string().nullable().optional(),

    // Execution
    tempo: z.string().nullable().optional(),
    rest_seconds: z.number().nullable().optional(),

    // Classification
    set_type: SetType_zod.optional().default('working'),

    // Notes
    notes: z.string().nullable().optional(),
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
    day_number: z.number().int().min(1).max(7, 'Day number must be between 1 and 7'),
    elements: z.array(WorkoutElement_zod).optional(),
});

export const CreateTrainingPlan_zod = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),
    description: z.string().optional().default(''),
    is_template: z.boolean().default(true),
    workouts: z.array(PlannedWorkout_zod).optional(),
});

// Schema for assigning a training plan to a client (requires dates)
export const AssignTrainingPlan_zod = z.object({
    client_id: z.string().uuid('Client ID is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
});

export type AssignTrainingPlanInput = z.infer<typeof AssignTrainingPlan_zod>;
export type CreateTrainingPlan = z.infer<typeof CreateTrainingPlan_zod>;
export type UpdateTrainingPlan = Partial<CreateTrainingPlan> & {id: string};
