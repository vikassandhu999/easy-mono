import {z} from 'zod';

import {MealSessionSettings_zod, Session, SessionType} from '@/services/session';

export const WorkoutSectionSchema = z.discriminatedUnion('type', [
    z.object({
        id: z.string(),
        type: z.literal('superset'),
        title: z.string(),
        format: z.string(),
        note: z.string(),
        target_rounds: z.number(),
        target_duration_seconds: z.number(),
        exercises: z.array(
            z.object({
                id: z.string(),
                content_id: z.string(),
                each_side: z.boolean(),
                tempo: z.string(),
                sets: z.array(
                    z.object({
                        reps: z.object({value: z.number()}),
                        weight: z.object({value: z.number(), unit: z.string()}),
                        duration: z.object({value: z.number()}),
                        rest_seconds: z.object({value: z.number()}),
                    }),
                ),
            }),
        ),
    }),

    z.object({
        id: z.string(),
        type: z.literal('hidden'),
        title: z.string().optional(),
        format: z.string().optional(),
        note: z.string().optional(),
        target_rounds: z.number().optional(),
        target_duration_seconds: z.number().optional(),
        exercises: z
            .array(
                z.object({
                    id: z.string(),
                    content_id: z.string(),
                    each_side: z.boolean(),
                    tempo: z.string(),
                    sets: z.array(
                        z.object({
                            reps: z.object({value: z.number()}),
                            weight: z.object({value: z.number(), unit: z.string()}),
                            duration: z.object({value: z.number()}),
                            rest_seconds: z.object({value: z.number()}),
                        }),
                    ),
                }),
            )
            .optional(),
    }),
]);

export const WorkoutSettingsSchema = z.object({
    estimated_duration_minutes: z.number().min(1).max(480).optional(),
    notes: z.string().max(2000).optional(),
});

export const WorkoutDefinitionSchema = z
    .object({
        sections: z.array(WorkoutSectionSchema).optional(),
        settings: WorkoutSettingsSchema.optional(),
    })
    .optional();

export const MealSettingsSchema = MealSessionSettings_zod;
export const MealDefinitionSchema = z.object({
    sections: z.array(
        z.object({
            id: z.string(),
            content_id: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
        }),
    ),
    settings: MealSettingsSchema.optional(),
});

export const BaseSessionSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    session_type: SessionType,
    duration_minutes: z.number().int().min(1).max(480).optional(),
});

export const SessionFormSchema = z.discriminatedUnion('session_type', [
    BaseSessionSchema.extend({
        session_type: z.literal('workout'),
        definition: WorkoutDefinitionSchema,
    }),
    BaseSessionSchema.extend({
        session_type: z.literal('meal'),
        definition: MealDefinitionSchema,
    }),
]);

export type SessionFormValues = z.infer<typeof SessionFormSchema>;

export class DefinitionBuildError extends Error {}

export const sanitizeString = (value?: null | string): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

export const sanitizeStringArray = (values?: null | string[]): string[] | undefined => {
    if (!values) {
        return undefined;
    }
    const sanitized = values.map((item) => sanitizeString(item)).filter((item): item is string => Boolean(item));
    return sanitized.length > 0 ? sanitized : undefined;
};

function defaultDefinition(sessionType: SessionType) {
    switch (sessionType) {
        case 'workout':
            return {sections: []};
        case 'meal':
            return {sections: []};
        default:
            throw new DefinitionBuildError(`Unsupported session type: ${sessionType}`);
    }
}

export function sessionToFormValues(session?: null | Session, sessionType?: SessionType): SessionFormValues {
    return {
        name: session?.name ?? '',
        description: session?.description ?? undefined,
        duration_minutes: session?.duration_minutes ?? undefined,
        session_type: session?.session_type ?? sessionType,
        definition: session?.definition ?? defaultDefinition(session?.session_type ?? sessionType ?? 'workout'),
    } as SessionFormValues;
}
