import {z} from 'zod';

import {
    CreateSession,
    InstructionDefinition,
    InstructionSessionSettings_zod,
    MealDefinition,
    MealSessionSettings_zod,
    MeasurementDefinition,
    MeasurementSessionSettings_zod,
    Session,
    SessionItemConfig,
    SessionType,
    UpdateSession,
    WorkoutDefinition,
    WorkoutSessionSettings_zod,
} from '@/api/sessions';

import {
    itemsToWorkoutDefinition,
    WORKOUT_PLACEHOLDER_CONTENT_ID,
    WORKOUT_PLACEHOLDER_EXERCISE_ID,
    WORKOUT_PLACEHOLDER_SECTION_ID,
} from './utils';

export const SessionFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
    description: z
        .string()
        .max(2000, 'Description cannot exceed 2000 characters')
        .optional()
        .transform((value) => (value?.trim() ? value.trim() : undefined)),
    session_type: SessionType,
    duration_minutes: z
        .number({invalid_type_error: 'Duration must be a number'})
        .int('Duration must be a whole number')
        .min(1, 'Duration must be at least 1 minute')
        .max(480, 'Duration cannot exceed 480 minutes')
        .optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
});

export type SessionFormValues = z.infer<typeof SessionFormSchema>;

export class DefinitionBuildError extends Error {}

const sanitizeString = (value?: null | string): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeStringArray = (values?: null | string[]): string[] | undefined => {
    if (!values) {
        return undefined;
    }
    const sanitized = values.map((item) => sanitizeString(item)).filter((item): item is string => Boolean(item));
    return sanitized.length > 0 ? sanitized : undefined;
};

const sanitizeWorkoutSettings = (settings?: SessionFormValues['workout_settings']): WorkoutDefinition['settings'] => {
    if (!settings) {
        return undefined;
    }

    const sanitized: NonNullable<WorkoutDefinition['settings']> = {};

    if (typeof settings.estimated_duration_minutes === 'number') {
        sanitized.estimated_duration_minutes = settings.estimated_duration_minutes;
    }

    const notes = sanitizeString(settings.notes);
    if (notes) {
        sanitized.notes = notes;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const sanitizeMealSettings = (settings?: SessionFormValues['meal_settings']): MealDefinition['settings'] => {
    if (!settings) {
        return undefined;
    }

    const sanitized: NonNullable<MealDefinition['settings']> = {};

    if (typeof settings.target_calories === 'number') {
        sanitized.target_calories = settings.target_calories;
    }
    if (typeof settings.target_protein_g === 'number') {
        sanitized.target_protein_g = settings.target_protein_g;
    }
    if (typeof settings.target_carbs_g === 'number') {
        sanitized.target_carbs_g = settings.target_carbs_g;
    }
    if (typeof settings.target_fats_g === 'number') {
        sanitized.target_fats_g = settings.target_fats_g;
    }

    const mealType = sanitizeString(settings.meal_type);
    if (mealType) {
        sanitized.meal_type = mealType;
    }

    if (typeof settings.preparation_time_minutes === 'number') {
        sanitized.preparation_time_minutes = settings.preparation_time_minutes;
    }

    const difficulty = sanitizeString(settings.difficulty);
    if (difficulty) {
        sanitized.difficulty = difficulty;
    }

    const dietaryRestrictions = sanitizeStringArray(settings.dietary_restrictions);
    if (dietaryRestrictions) {
        sanitized.dietary_restrictions = dietaryRestrictions;
    }

    const allergenWarnings = sanitizeStringArray(settings.allergen_warnings);
    if (allergenWarnings) {
        sanitized.allergen_warnings = allergenWarnings;
    }

    if (typeof settings.meal_prep_friendly === 'boolean') {
        sanitized.meal_prep_friendly = settings.meal_prep_friendly;
    }

    const notes = sanitizeString(settings.notes);
    if (notes) {
        sanitized.notes = notes;
    }

    const equipmentNeeded = sanitizeStringArray(settings.equipment_needed);
    if (equipmentNeeded) {
        sanitized.equipment_needed = equipmentNeeded;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const sanitizeInstructionSettings = (
    settings?: SessionFormValues['instruction_settings'],
): InstructionDefinition['settings'] => {
    if (!settings) {
        return undefined;
    }

    const instructionText = sanitizeString(settings.instruction_text);
    if (!instructionText) {
        return undefined;
    }

    const sanitized: InstructionDefinition['settings'] = {
        instruction_text: instructionText,
    };

    const mediaUrls = sanitizeStringArray(settings.media_urls);
    if (mediaUrls) {
        sanitized.media_urls = mediaUrls;
    }

    if (typeof settings.estimated_duration_minutes === 'number') {
        sanitized.estimated_duration_minutes = settings.estimated_duration_minutes;
    }

    const checklistItems = sanitizeStringArray(settings.checklist_items);
    if (checklistItems) {
        sanitized.checklist_items = checklistItems;
    }

    const reminderText = sanitizeString(settings.reminder_text);
    if (reminderText) {
        sanitized.reminder_text = reminderText;
    }

    return sanitized;
};

const sanitizeMeasurementSettings = (
    settings?: SessionFormValues['measurement_settings'],
): MeasurementDefinition['settings'] => {
    if (!settings) {
        return undefined;
    }

    const metricKeys = sanitizeStringArray(settings.metric_keys);
    if (!metricKeys) {
        return undefined;
    }

    const sanitized: MeasurementDefinition['settings'] = {
        metric_keys: metricKeys,
    };

    const measurementInstructions = sanitizeString(settings.measurement_instructions);
    if (measurementInstructions) {
        sanitized.measurement_instructions = measurementInstructions;
    }

    const reminderText = sanitizeString(settings.reminder_text);
    if (reminderText) {
        sanitized.reminder_text = reminderText;
    }

    const frequency = sanitizeString(settings.frequency_recommendation);
    if (frequency) {
        sanitized.frequency_recommendation = frequency;
    }

    const bestTimeOfDay = sanitizeString(settings.best_time_of_day);
    if (bestTimeOfDay) {
        sanitized.best_time_of_day = bestTimeOfDay;
    }

    return sanitized;
};

const hasDefinitionSettings = (values: Partial<SessionFormValues>): boolean =>
    Boolean(
        values.workout_settings ?? values.meal_settings ?? values.instruction_settings ?? values.measurement_settings,
    );

const filterWorkoutSections = (sections: undefined | WorkoutDefinition['sections']): WorkoutDefinition['sections'] => {
    if (!sections) {
        return undefined;
    }

    const normalized = sections
        .map((section) => ({
            ...section,
            exercises: section.exercises?.filter(
                (exercise) =>
                    exercise &&
                    exercise.id !== WORKOUT_PLACEHOLDER_EXERCISE_ID &&
                    exercise.content_id !== WORKOUT_PLACEHOLDER_CONTENT_ID,
            ),
        }))
        .filter((section) => (section.exercises?.length ?? 0) > 0);

    return normalized.length > 0 ? (normalized as WorkoutDefinition['sections']) : undefined;
};

type DefinitionPayload = {
    definition?: unknown;
    instruction_definition?: InstructionDefinition;
    meal_definition?: MealDefinition;
    measurement_definition?: MeasurementDefinition;
    workout_definition?: WorkoutDefinition;
};

interface BuildDefinitionOptions {
    currentSession?: Session;
    requireDefinition: boolean;
    targetSessionType?: SessionType;
    workoutItems?: SessionItemConfig[];
}

const buildDefinitionPayload = (
    values: Partial<SessionFormValues>,
    {currentSession, requireDefinition, targetSessionType, workoutItems}: BuildDefinitionOptions,
): DefinitionPayload => {
    const sessionType = targetSessionType ?? values.session_type ?? currentSession?.session_type;

    if (!sessionType) {
        if (requireDefinition) {
            throw new DefinitionBuildError('Session type is required.');
        }
        return {};
    }

    switch (sessionType) {
        case 'workout': {
            const existingDefinition = currentSession?.workout_definition;
            const sanitizedSettings = sanitizeWorkoutSettings(values.workout_settings) ?? existingDefinition?.settings;
            const existingSections = filterWorkoutSections(existingDefinition?.sections);

            const itemsDefinition = workoutItems?.length
                ? itemsToWorkoutDefinition('workout', workoutItems, existingDefinition)
                : null;

            const resolvedDefinition = (() => {
                if (itemsDefinition) {
                    return itemsDefinition;
                }

                let sections = existingSections;
                if (!sections && requireDefinition) {
                    sections = [
                        {
                            id: WORKOUT_PLACEHOLDER_SECTION_ID,
                            exercises: [
                                {
                                    content_id: WORKOUT_PLACEHOLDER_CONTENT_ID,
                                    id: WORKOUT_PLACEHOLDER_EXERCISE_ID,
                                },
                            ],
                        },
                    ] as WorkoutDefinition['sections'];
                }

                if (!sections) {
                    return null;
                }

                const definition: WorkoutDefinition = {
                    sections,
                };

                if (existingDefinition?.settings) {
                    definition.settings = existingDefinition.settings;
                }

                return definition;
            })();

            if (!resolvedDefinition) {
                if (requireDefinition) {
                    throw new DefinitionBuildError('Workout sessions require at least one exercise.');
                }
                return {};
            }

            if (sanitizedSettings) {
                resolvedDefinition.settings = {
                    ...(resolvedDefinition.settings ?? {}),
                    ...sanitizedSettings,
                };
            }

            return {
                definition: resolvedDefinition,
                workout_definition: resolvedDefinition,
            };
        }
        case 'meal': {
            const existingDefinition = currentSession?.meal_definition;
            const sanitizedSettings = sanitizeMealSettings(values.meal_settings) ?? existingDefinition?.settings;
            const sections = existingDefinition?.sections;

            if (!sections || sections.length === 0) {
                if (requireDefinition) {
                    throw new DefinitionBuildError('Meal sessions require at least one content block.');
                }
                return {};
            }

            const definition: MealDefinition = {
                sections,
            };
            if (sanitizedSettings) {
                definition.settings = sanitizedSettings;
            }

            return {
                definition,
                meal_definition: definition,
            };
        }
        case 'instruction': {
            const existingDefinition = currentSession?.instruction_definition;
            const sanitizedSettings =
                sanitizeInstructionSettings(values.instruction_settings) ?? existingDefinition?.settings;
            const sections = existingDefinition?.sections ?? [];

            if (!sanitizedSettings) {
                if (requireDefinition) {
                    throw new DefinitionBuildError('Instruction sessions require instruction text.');
                }
                return {};
            }

            const definition: InstructionDefinition = {
                settings: sanitizedSettings,
                sections,
            };

            return {
                definition,
                instruction_definition: definition,
            };
        }
        case 'measurement': {
            const existingDefinition = currentSession?.measurement_definition;
            const sanitizedSettings =
                sanitizeMeasurementSettings(values.measurement_settings) ?? existingDefinition?.settings;
            const sections = existingDefinition?.sections ?? [];

            if (!sanitizedSettings) {
                if (requireDefinition) {
                    throw new DefinitionBuildError('Measurement sessions require at least one metric key.');
                }
                return {};
            }

            const definition: MeasurementDefinition = {
                settings: sanitizedSettings,
                sections,
            };

            return {
                definition,
                measurement_definition: definition,
            };
        }
        default:
            return {};
    }
};

const BASE_DEFAULTS: Omit<SessionFormValues, 'session_type'> = {
    name: '',
    description: undefined,
    duration_minutes: 30,
    workout_settings: undefined,
    meal_settings: undefined,
    instruction_settings: undefined,
    measurement_settings: undefined,
};

export function createDefaultFormValues(
    sessionType: SessionType,
    overrides?: Partial<SessionFormValues>,
): SessionFormValues {
    const base: SessionFormValues = {
        ...BASE_DEFAULTS,
        session_type: sessionType,
    };

    const merged: SessionFormValues = {
        ...base,
        ...overrides,
        session_type: overrides?.session_type ?? sessionType,
        duration_minutes: overrides?.duration_minutes ?? base.duration_minutes,
        name: overrides?.name ?? base.name,
    };

    if (sessionType === 'workout') {
        merged.workout_settings = {
            estimated_duration_minutes: overrides?.workout_settings?.estimated_duration_minutes ?? 30,
            notes: overrides?.workout_settings?.notes ?? '',
        };
    } else {
        merged.workout_settings = undefined;
    }

    if (sessionType === 'meal') {
        merged.meal_settings = {
            allergen_warnings: overrides?.meal_settings?.allergen_warnings ?? [],
            dietary_restrictions: overrides?.meal_settings?.dietary_restrictions ?? [],
            equipment_needed: overrides?.meal_settings?.equipment_needed ?? [],
            meal_prep_friendly: overrides?.meal_settings?.meal_prep_friendly ?? false,
            notes: overrides?.meal_settings?.notes ?? '',
            target_calories: overrides?.meal_settings?.target_calories,
            target_carbs_g: overrides?.meal_settings?.target_carbs_g,
            target_fats_g: overrides?.meal_settings?.target_fats_g,
            target_protein_g: overrides?.meal_settings?.target_protein_g,
            meal_type: overrides?.meal_settings?.meal_type,
            preparation_time_minutes: overrides?.meal_settings?.preparation_time_minutes,
            difficulty: overrides?.meal_settings?.difficulty,
        };
    } else {
        merged.meal_settings = undefined;
    }

    if (sessionType === 'instruction') {
        merged.instruction_settings = {
            instruction_text: overrides?.instruction_settings?.instruction_text ?? '',
            checklist_items: overrides?.instruction_settings?.checklist_items ?? [],
            estimated_duration_minutes: overrides?.instruction_settings?.estimated_duration_minutes,
            media_urls: overrides?.instruction_settings?.media_urls ?? [],
            reminder_text: overrides?.instruction_settings?.reminder_text,
        };
    } else {
        merged.instruction_settings = undefined;
    }

    if (sessionType === 'measurement') {
        merged.measurement_settings = {
            metric_keys: overrides?.measurement_settings?.metric_keys ?? [],
            best_time_of_day: overrides?.measurement_settings?.best_time_of_day,
            frequency_recommendation: overrides?.measurement_settings?.frequency_recommendation,
            measurement_instructions: overrides?.measurement_settings?.measurement_instructions,
            reminder_text: overrides?.measurement_settings?.reminder_text,
        };
    } else {
        merged.measurement_settings = undefined;
    }

    return merged;
}

export function sessionToFormValues(session: Session): SessionFormValues {
    return createDefaultFormValues(session.session_type, {
        description: session.description ?? undefined,
        duration_minutes: session.duration_minutes ?? undefined,
        instruction_settings: session.instruction_settings ?? undefined,
        meal_settings: session.meal_settings ?? undefined,
        measurement_settings: session.measurement_settings ?? undefined,
        name: session.name,
        session_type: session.session_type,
        workout_settings: session.workout_settings ?? undefined,
    });
}

function shouldIncludeDefinition(values: Partial<SessionFormValues>, currentSession?: Session): boolean {
    if (!currentSession) {
        return true;
    }
    const typeChanged = Boolean(
        values.session_type && currentSession && values.session_type !== currentSession.session_type,
    );
    return typeChanged || hasDefinitionSettings(values);
}

export function toCreateSessionPayload(
    values: SessionFormValues,
    options?: {workoutItems?: SessionItemConfig[]},
): CreateSession {
    const payload: CreateSession = {
        name: values.name.trim(),
        session_type: values.session_type,
    };

    const description = sanitizeString(values.description);
    if (description) {
        payload.description = description;
    }

    if (typeof values.duration_minutes === 'number') {
        payload.duration_minutes = values.duration_minutes;
    }

    const definitionPayload = buildDefinitionPayload(values, {
        requireDefinition: true,
        targetSessionType: values.session_type,
        workoutItems: options?.workoutItems,
    });

    if (definitionPayload.definition === undefined) {
        throw new DefinitionBuildError('Definition payload is required for session creation.');
    }

    payload.definition = definitionPayload.definition;

    if (definitionPayload.workout_definition) {
        payload.workout_definition = definitionPayload.workout_definition;
    }
    if (definitionPayload.meal_definition) {
        payload.meal_definition = definitionPayload.meal_definition;
    }
    if (definitionPayload.instruction_definition) {
        payload.instruction_definition = definitionPayload.instruction_definition;
    }
    if (definitionPayload.measurement_definition) {
        payload.measurement_definition = definitionPayload.measurement_definition;
    }

    const workoutSettings = sanitizeWorkoutSettings(values.workout_settings);
    if (workoutSettings) {
        payload.workout_settings = workoutSettings;
    }

    const mealSettings = sanitizeMealSettings(values.meal_settings);
    if (mealSettings) {
        payload.meal_settings = mealSettings;
    }

    const instructionSettings = sanitizeInstructionSettings(values.instruction_settings);
    if (instructionSettings) {
        payload.instruction_settings = instructionSettings;
    }

    const measurementSettings = sanitizeMeasurementSettings(values.measurement_settings);
    if (measurementSettings) {
        payload.measurement_settings = measurementSettings;
    }

    return payload;
}

export function toUpdateSessionPayload(
    values: Partial<SessionFormValues>,
    session?: Session,
    options?: {workoutItems?: SessionItemConfig[]},
): UpdateSession {
    const payload: UpdateSession = {};

    if (values.name) {
        payload.name = values.name.trim();
    }

    if (values.description !== undefined) {
        const trimmed = values.description?.trim();
        payload.description = trimmed ?? '';
    }

    if (values.duration_minutes !== undefined) {
        payload.duration_minutes = values.duration_minutes;
    }

    if (values.session_type) {
        payload.session_type = values.session_type;
    }

    const includeDefinition = shouldIncludeDefinition(values, session);

    if (includeDefinition) {
        const definitionPayload = buildDefinitionPayload(values, {
            currentSession: session,
            requireDefinition: true,
            targetSessionType: values.session_type ?? session?.session_type,
            workoutItems: options?.workoutItems,
        });

        if (definitionPayload.definition !== undefined) {
            payload.definition = definitionPayload.definition;
        }
        if (definitionPayload.workout_definition) {
            payload.workout_definition = definitionPayload.workout_definition;
        }
        if (definitionPayload.meal_definition) {
            payload.meal_definition = definitionPayload.meal_definition;
        }
        if (definitionPayload.instruction_definition) {
            payload.instruction_definition = definitionPayload.instruction_definition;
        }
        if (definitionPayload.measurement_definition) {
            payload.measurement_definition = definitionPayload.measurement_definition;
        }
    }

    return payload;
}
