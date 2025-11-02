import type {Session, SessionItemConfig, SessionType, WorkoutDefinition} from '@/services/session';

export const WORKOUT_PLACEHOLDER_SECTION_ID = '__session_placeholder_section__';
export const WORKOUT_PLACEHOLDER_EXERCISE_ID = '__session_placeholder_exercise__';
export const WORKOUT_PLACEHOLDER_CONTENT_ID = '00000000-0000-0000-0000-000000000000';

const isPlaceholderWorkoutExercise = (
    exercise: NonNullable<WorkoutDefinition['sections']>[number]['exercises'][number],
): boolean => exercise.id === WORKOUT_PLACEHOLDER_EXERCISE_ID || exercise.content_id === WORKOUT_PLACEHOLDER_CONTENT_ID;

const sanitizeWorkoutSections = (
    sections: undefined | WorkoutDefinition['sections'],
): WorkoutDefinition['sections'] => {
    if (!sections) {
        return undefined;
    }

    const cleaned = sections
        .map((section) => ({
            ...section,
            exercises: section.exercises?.filter((exercise) => exercise && !isPlaceholderWorkoutExercise(exercise)),
        }))
        .filter((section) => (section.exercises?.length ?? 0) > 0);

    return cleaned.length > 0 ? (cleaned as WorkoutDefinition['sections']) : undefined;
};

const EXERCISE_ID_META_KEY = 'workout_exercise_id';
const SECTION_ID_META_KEY = 'workout_section_id';

const randomId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id_${Math.random().toString(36).slice(2, 11)}`;
};

const createMetadata = (exerciseId?: string, sectionId?: string) => {
    const metadata: Record<string, unknown> = {};
    if (exerciseId) {
        metadata[EXERCISE_ID_META_KEY] = exerciseId;
    }
    if (sectionId) {
        metadata[SECTION_ID_META_KEY] = sectionId;
    }
    return metadata;
};

const getExerciseId = (item: SessionItemConfig): string => {
    const raw = item.metadata?.[EXERCISE_ID_META_KEY];
    return typeof raw === 'string' && raw.length > 0 ? raw : randomId();
};

const getSectionIdFromItems = (items: SessionItemConfig[]): string | undefined => {
    const found = items.find((item) => typeof item.metadata?.[SECTION_ID_META_KEY] === 'string');
    return found?.metadata?.[SECTION_ID_META_KEY] as string | undefined;
};

export const workoutDefinitionToItems = (session: Session): SessionItemConfig[] => {
    const definition = session.workout_definition;
    if (!definition || !definition.sections || definition.sections.length === 0) {
        return [];
    }

    const contentMap = new Map((session.content_details ?? []).map((content) => [content.id, content]));

    const items: SessionItemConfig[] = [];
    sanitizeWorkoutSections(definition.sections)?.forEach((section) => {
        section.exercises?.forEach((exercise) => {
            const metadata = createMetadata(exercise.id, section.id);

            items.push({
                content: contentMap.get(exercise.content_id),
                content_id: exercise.content_id,
                custom_instructions: undefined,
                display_order: items.length + 1,
                metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
                rest_seconds: undefined,
                sets: undefined,
            });
        });
    });

    return items;
};

const buildWorkoutDefinitionFromItems = (
    items: SessionItemConfig[],
    existingDefinition?: null | WorkoutDefinition,
): null | WorkoutDefinition => {
    if (items.length === 0) {
        return null;
    }

    const existingSections = sanitizeWorkoutSections(existingDefinition?.sections);
    const existingExercises = new Map<string, WorkoutDefinition['sections'][number]['exercises'][number]>();
    existingSections.forEach((section) => {
        section.exercises?.forEach((exercise) => {
            if (exercise?.id) {
                existingExercises.set(exercise.id, exercise);
            }
        });
    });

    const sortedItems = [...items].sort((a, b) => a.display_order - b.display_order);
    const sectionIdFromMetadata = getSectionIdFromItems(sortedItems);
    const baseSection =
        existingSections?.find((section) => section.id === sectionIdFromMetadata) ?? existingSections?.[0];

    const sectionId =
        typeof sectionIdFromMetadata === 'string' && sectionIdFromMetadata.length > 0
            ? sectionIdFromMetadata
            : (baseSection?.id ?? randomId());

    const exercises = sortedItems.map((item) => {
        const exerciseId = getExerciseId(item);
        const existing = existingExercises.get(exerciseId);
        return {
            ...(existing ?? {}),
            id: exerciseId,
            content_id: item.content_id,
        };
    });

    const sectionPayload = {
        ...(baseSection ? {...baseSection} : {}),
        id: sectionId,
        exercises,
    };

    return {
        settings: existingDefinition?.settings,
        sections: [sectionPayload],
    } as unknown as WorkoutDefinition;
};

export const itemsToWorkoutDefinition = (
    sessionType: SessionType,
    items: SessionItemConfig[],
    existingDefinition?: null | WorkoutDefinition,
): null | WorkoutDefinition => {
    if (sessionType !== 'workout') {
        return null;
    }

    return buildWorkoutDefinitionFromItems(items, existingDefinition);
};
