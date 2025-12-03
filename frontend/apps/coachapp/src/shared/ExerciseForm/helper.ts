import {CreateExercise, Exercise} from '@/services/exercises';

export const getDefaultValues: Partial<CreateExercise> = {
    name: '',
    description: undefined,
    instructions: undefined,
    mechanics: undefined,
    force: undefined,
    muscle_ids: [],
    equipment_ids: [],
    images: [],
};

export const populateExercise = (exercise: Exercise): CreateExercise => {
    return {
        name: exercise.name,
        description: exercise.description || undefined,
        instructions: exercise.instructions || undefined,
        mechanics: exercise.mechanics || undefined,
        force: exercise.force || undefined,
        muscle_ids: exercise.muscles?.map((m) => m.id) || [],
        equipment_ids: exercise.equipment?.map((e) => e.id) || [],
        images: exercise.images || [],
    };
};
