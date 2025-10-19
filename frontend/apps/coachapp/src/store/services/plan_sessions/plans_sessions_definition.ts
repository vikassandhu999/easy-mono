import {z} from 'zod';

export const PlanSessionSortEnum = z.enum([
    'calendar_date',
    'day_order',
    'group_order',
    'created_at',
    'created_at_desc',
]);
export type PlanSessionSort = z.infer<typeof PlanSessionSortEnum>;

export const PlanSessionSessionTypeEnum = z.enum(['workout', 'meal', 'instruction', 'measurement']);
export type PlanSessionSessionType = z.infer<typeof PlanSessionSessionTypeEnum>;

export const PlanSession_zod = z.object({
    id: z.string().uuid(),
    plan_id: z.string().uuid(),
    business_id: z.string().uuid(),
    session_id: z.string().uuid(),
    label: z.string().optional().nullable(),
    is_required: z.boolean(),
    notes: z.string().nullable().optional(),
    day_of_week: z.number().int().min(0).max(6).nullable().optional(),
    calendar_date: z.string().datetime().nullable().optional(),
    window_start_minutes: z.number().int().nullable().optional(),
    window_end_minutes: z.number().int().nullable().optional(),
    duration_minutes: z.number().int().nullable().optional(),
    day_order: z.number().int().nullable().optional(),
    group_id: z.string().uuid().nullable().optional(),
    group_order: z.number().int().nullable().optional(),
    substitutes_for: z.string().uuid().nullable().optional(),
    override_name: z.string().nullable().optional(),
    override_notes: z.string().nullable().optional(),
    override_settings: z.record(z.any()).nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    session: z
        .object({
            id: z.string().uuid(),
            business_id: z.string().uuid(),
            name: z.string(),
            description: z.string().nullable().optional(),
            session_type: PlanSessionSessionTypeEnum,
            duration_minutes: z.number().int().nullable().optional(),
            definition: z.unknown().optional(),
            item_configs: z.array(z.record(z.any())).optional(),
            items: z.array(z.record(z.any())).optional(),
            created_at: z.string(),
            updated_at: z.string(),
        })
        .optional(),
});
export type PlanSession = z.infer<typeof PlanSession_zod>;

export const PlanSessionList_zod = z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    records: z.array(PlanSession_zod),
    total: z.number().int().optional(),
});
export type PlanSessionList = z.infer<typeof PlanSessionList_zod>;

export const CreatePlanSessionInput_zod = z.object({
    session_id: z.string().uuid(),
    label: z.string().nullable().optional(),
    is_required: z.boolean().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    calendar_date: z.string().datetime().optional(),
    window_start_minutes: z.number().int().optional(),
    window_end_minutes: z.number().int().optional(),
    duration_minutes: z.number().int().optional(),
    day_order: z.number().int().optional(),
    group_id: z.string().uuid().optional(),
    group_order: z.number().int().optional(),
    notes: z.string().optional(),
    substitutes_for: z.string().uuid().optional(),
    override_name: z.string().optional(),
    override_notes: z.string().optional(),
    override_settings: z.record(z.any()).optional(),
});
export type CreatePlanSessionInput = z.infer<typeof CreatePlanSessionInput_zod>;

export const UpdatePlanSessionInput_zod = CreatePlanSessionInput_zod.partial();
export type UpdatePlanSessionInput = z.infer<typeof UpdatePlanSessionInput_zod>;

export const PlanSessionQueryParams_zod = z.object({
    day_of_week: z.number().int().optional(),
    calendar_date: z.string().datetime().optional(),
    session_id: z.string().uuid().optional(),
    group_id: z.string().uuid().optional(),
    include_session: z.boolean().optional(),
    is_required: z.boolean().optional(),
    has_overrides: z.boolean().optional(),
    page: z.number().int().optional(),
    page_size: z.number().int().optional(),
    sort: PlanSessionSortEnum.optional(),
});
export type PlanSessionQueryParams = z.infer<typeof PlanSessionQueryParams_zod>;
