import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const SessionType = z.enum(['workout', 'meal']);

export const SessionItemConfig_zod = z.object({
    content: z.lazy(() => ContentDetail_zod).optional(),
    content_id: z.string().uuid(),
    custom_instructions: z.string().optional(),
    display_order: z.number().int(),
    is_optional: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    sets: z.number().int().min(0).optional(),
    reps: z.string().optional(),
    weight: z.number().optional(),
    distance: z.number().optional(),
    duration: z.string().optional(),
    rest_seconds: z.number().int().min(0).optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
});

export const ContentDetail_zod = z.object({
    archived_at: z.string().optional(),
    created_at: z.string(),
    created_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    created_by_id: z.string().uuid(),
    description: z.string(),
    duration: z.number().optional(),
    id: z.string().uuid(),
    instructions: z.string().optional(),
    instructions_type: z.string().optional(),
    is_archived: z.boolean(),
    is_published: z.boolean(),
    last_edited_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    last_edited_by_id: z.string().uuid().optional(),
    media: z.record(z.any()).optional(),
    metric_keys: z.array(z.string()).optional(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    thumbnail_url: z.string().optional(),
    type: z.string(),
    updated_at: z.string(),
});

export const WorkoutSessionSettings_zod = z.object({
    estimated_duration_minutes: z.number().int().min(1).optional(),
    notes: z.string().optional(),
});

export const MealSessionSettings_zod = z.object({
    target_calories: z.number().optional(),
    target_protein_g: z.number().optional(),
    target_carbs_g: z.number().optional(),
    target_fats_g: z.number().optional(),
    meal_type: z.string().optional(),
    preparation_time_minutes: z.number().int().min(0).optional(),
    difficulty: z.string().optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    allergen_warnings: z.array(z.string()).optional(),
    meal_prep_friendly: z.boolean().optional(),
    notes: z.string().optional(),
    equipment_needed: z.array(z.string()).optional(),
});

export const InstructionSessionSettings_zod = z.object({
    instruction_text: z.string().min(1),
    media_urls: z.array(z.string()).optional(),
    estimated_duration_minutes: z.number().int().min(1).optional(),
    checklist_items: z.array(z.string()).optional(),
    reminder_text: z.string().optional(),
});

export const MeasurementSessionSettings_zod = z.object({
    metric_keys: z.array(z.string()).min(1),
    measurement_instructions: z.string().optional(),
    reminder_text: z.string().optional(),
    frequency_recommendation: z.string().optional(),
    best_time_of_day: z.string().optional(),
});

export const RepsValue_zod = z.object({
    value: z.number().int().min(1),
});

export const WeightValue_zod = z.object({
    value: z.number(),
    unit: z.string(),
});

export const TimeValue_zod = z.object({
    value: z.number().int().min(0),
});

export const WorkoutSet_zod = z.object({
    reps: RepsValue_zod.optional(),
    weight: WeightValue_zod.optional(),
    duration: TimeValue_zod.optional(),
    rest_seconds: TimeValue_zod.optional(),
});

export const WorkoutExercise_zod = z.object({
    id: z.string(),
    content_id: z.string().uuid(),
    each_side: z.boolean().optional(),
    tempo: z.string().optional(),
    sets: z.array(WorkoutSet_zod).optional(),
});

export const WorkoutSection_zod = z.object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    format: z.string().optional(),
    note: z.string().optional(),
    target_rounds: z.number().int().min(1).optional(),
    target_duration_seconds: z.number().int().min(1).optional(),
    exercises: z.array(WorkoutExercise_zod).nonempty(),
});

export const MealItemMacros_zod = z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fats: z.number().optional(),
});

export const MealItem_zod = z.object({
    key: z.string(),
    content_id: z.string().uuid(),
    order: z.number().int(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    preparation: z.string().optional(),
    notes: z.string().optional(),
    is_optional: z.boolean(),
    swappable: z.boolean().optional(),
    macros: MealItemMacros_zod.optional(),
    metadata: z.record(z.any()).optional(),
});

export const MealBlock_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    type: z.string().optional(),
    order: z.number().int(),
    items: z.array(MealItem_zod),
});

export const MealSection_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    order: z.number().int(),
    note: z.string().optional(),
    blocks: z.array(MealBlock_zod),
});

export const InstructionResource_zod = z.object({
    label: z.string(),
    url: z.string().url(),
    description: z.string().optional(),
});

export const InstructionStep_zod = z.object({
    order: z.number().int(),
    text: z.string(),
    required: z.boolean(),
    media_urls: z.array(z.string()).optional(),
    target_duration_seconds: z.number().int().min(0).optional(),
});

export const InstructionBlock_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    order: z.number().int(),
    steps: z.array(InstructionStep_zod),
    resources: z.array(InstructionResource_zod).optional(),
});

export const InstructionSection_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    order: z.number().int(),
    note: z.string().optional(),
    blocks: z.array(InstructionBlock_zod),
});

export const MeasurementMetric_zod = z.object({
    key: z.string(),
    label: z.string().optional(),
    content_id: z.string().uuid().optional(),
    order: z.number().int(),
    target_value: z.number().optional(),
    target_unit: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export const MeasurementBlock_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    order: z.number().int(),
    metrics: z.array(MeasurementMetric_zod),
});

export const MeasurementSection_zod = z.object({
    key: z.string(),
    title: z.string().optional(),
    order: z.number().int(),
    note: z.string().optional(),
    blocks: z.array(MeasurementBlock_zod),
});

export const WorkoutDefinition_zod = z.object({
    settings: WorkoutSessionSettings_zod.optional(),
    sections: z.array(WorkoutSection_zod).nonempty(),
});

export const MealDefinition_zod = z
    .object({
        settings: MealSessionSettings_zod.optional(),
        sections: z.array(MealSection_zod).nonempty().optional(),
        items: z.array(SessionItemConfig_zod).nonempty().optional(),
    })
    .refine((value) => (value.sections?.length ?? 0) > 0 || (value.items?.length ?? 0) > 0, {
        message: 'meal_definition requires sections or items',
        path: ['sections'],
    });

export const InstructionDefinition_zod = z.object({
    settings: InstructionSessionSettings_zod,
    sections: z.array(InstructionSection_zod).optional(),
});

export const MeasurementDefinition_zod = z.object({
    settings: MeasurementSessionSettings_zod,
    sections: z.array(MeasurementSection_zod).optional(),
});

export const Session_zod = z.object({
    id: z.string().uuid(),
    business_id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    session_type: SessionType,
    duration_minutes: z.number().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string().uuid().optional(),
    definition: z.unknown().optional(),
    content_details: z.array(ContentDetail_zod).optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    workout_sections: z.array(WorkoutSection_zod).optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    meal_sections: z.array(MealSection_zod).optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    instruction_sections: z.array(InstructionSection_zod).optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
    measurement_sections: z.array(MeasurementSection_zod).optional(),
    workout_definition: WorkoutDefinition_zod.optional(),
    meal_definition: MealDefinition_zod.optional(),
    instruction_definition: InstructionDefinition_zod.optional(),
    measurement_definition: MeasurementDefinition_zod.optional(),
});

export const SessionListResponse_zod = z.object({
    page: z.number(),
    page_size: z.number(),
    records: z.array(Session_zod),
    total: z.number(),
});

export const CreateSession_zod = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    session_type: SessionType,
    duration_minutes: z.number().min(1).max(480).optional(),
    definition: z.unknown().optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
    workout_definition: WorkoutDefinition_zod.optional(),
    meal_definition: MealDefinition_zod.optional(),
    instruction_definition: InstructionDefinition_zod.optional(),
    measurement_definition: MeasurementDefinition_zod.optional(),
});

export const UpdateSession_zod = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    session_type: SessionType.optional(),
    duration_minutes: z.number().min(1).max(480).optional(),
    definition: z.unknown().optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
    workout_definition: WorkoutDefinition_zod.optional(),
    meal_definition: MealDefinition_zod.optional(),
    instruction_definition: InstructionDefinition_zod.optional(),
    measurement_definition: MeasurementDefinition_zod.optional(),
});

export const ListSessions_zod = z.object({
    include_contents: z.boolean().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
    search: z.string().optional(),
    session_type: SessionType.optional(),
});

export type ContentDetail = z.infer<typeof ContentDetail_zod>;
export type CreateSession = z.infer<typeof CreateSession_zod>;
export type ListSessions = z.infer<typeof ListSessions_zod>;
export type Session = z.infer<typeof Session_zod>;
export type SessionItemConfig = z.infer<typeof SessionItemConfig_zod>;
export type SessionListResponse = z.infer<typeof SessionListResponse_zod>;
export type SessionType = z.infer<typeof SessionType>;
export type UpdateSession = z.infer<typeof UpdateSession_zod>;
export type WorkoutSessionSettings = z.infer<typeof WorkoutSessionSettings_zod>;
export type MealSessionSettings = z.infer<typeof MealSessionSettings_zod>;
export type InstructionSessionSettings = z.infer<typeof InstructionSessionSettings_zod>;
export type MeasurementSessionSettings = z.infer<typeof MeasurementSessionSettings_zod>;
export type WorkoutSection = z.infer<typeof WorkoutSection_zod>;
export type WorkoutSet = z.infer<typeof WorkoutSet_zod>;
export type WorkoutDefinition = z.infer<typeof WorkoutDefinition_zod>;
export type MealSection = z.infer<typeof MealSection_zod>;
export type MealBlock = z.infer<typeof MealBlock_zod>;
export type MealItem = z.infer<typeof MealItem_zod>;
export type MealItemMacros = z.infer<typeof MealItemMacros_zod>;
export type MealDefinition = z.infer<typeof MealDefinition_zod>;
export type InstructionSection = z.infer<typeof InstructionSection_zod>;
export type InstructionBlock = z.infer<typeof InstructionBlock_zod>;
export type InstructionStep = z.infer<typeof InstructionStep_zod>;
export type InstructionResource = z.infer<typeof InstructionResource_zod>;
export type InstructionDefinition = z.infer<typeof InstructionDefinition_zod>;
export type MeasurementSection = z.infer<typeof MeasurementSection_zod>;
export type MeasurementBlock = z.infer<typeof MeasurementBlock_zod>;
export type MeasurementMetric = z.infer<typeof MeasurementMetric_zod>;
export type MeasurementDefinition = z.infer<typeof MeasurementDefinition_zod>;

// =============================
// API Client
// =============================
export const SessionsAPI = {
    createSession: async (input: CreateSession): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post('/v1/coach/sessions', input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    deleteSession: async (id: string): Promise<Result<void>> => {
        try {
            await authedClient.delete(`/v1/coach/sessions/${id}`);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getSession: async (id: string, params?: {include_contents?: boolean}): Promise<Result<Session>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessions/${id}`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listSessions: async (params?: ListSessions): Promise<Result<SessionListResponse>> => {
        try {
            const response = await authedClient.get('/v1/coach/sessions', {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateSession: async (id: string, input: UpdateSession): Promise<Result<Session>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/sessions/${id}`, input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
