import {baseAPISlice} from '../baseAPISlice';
import {type DistanceUnit, type LoadType, type SetType} from '../training_plans/training_plans_definition';

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

export type WorkoutElement = {
    id: string;
    position: number;
    superset_group_id: null | string;
    notes: null | string;
    exercise_id: string;
    planned_workout_id: string;
    sets: PlannedSet[];
    inserted_at?: string;
    updated_at?: string;
};

export type CreateWorkoutElement = {
    planned_workout_id: string;
    exercise_id: string;
    position: number;
    superset_group_id?: null | string;
    notes?: null | string;
    sets?: PlannedSet[];
};

export type UpdateWorkoutElement = {
    id: string;
    position?: number;
    superset_group_id?: null | string;
    notes?: null | string;
    sets?: PlannedSet[];
};

export const workoutElementsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createWorkoutElement: build.mutation<WorkoutElement, CreateWorkoutElement>({
            query: (body) => ({
                url: '/api/workout_elements',
                method: 'post',
                data: {workout_element: body},
            }),
            transformResponse: (response: {data: WorkoutElement}) => response.data,
            invalidatesTags: ['TrainingPlans'],
        }),

        getWorkoutElement: build.query<WorkoutElement, string>({
            query: (id) => ({
                url: `/api/workout_elements/${id}`,
                method: 'get',
            }),
            transformResponse: (response: {data: WorkoutElement}) => response.data,
        }),

        updateWorkoutElement: build.mutation<WorkoutElement, UpdateWorkoutElement>({
            query: (body) => ({
                url: `/api/workout_elements/${body.id}`,
                method: 'put',
                data: {
                    workout_element: {
                        ...body,
                        id: undefined,
                    },
                },
            }),
            transformResponse: (response: {data: WorkoutElement}) => response.data,
            invalidatesTags: ['TrainingPlans'],
        }),

        deleteWorkoutElement: build.mutation<void, string>({
            query: (id) => ({
                url: `/api/workout_elements/${id}`,
                method: 'delete',
            }),
            invalidatesTags: ['TrainingPlans'],
        }),
    }),
});

export const {
    useCreateWorkoutElementMutation: useCreateWorkoutElement,
    useGetWorkoutElementQuery: useGetWorkoutElement,
    useUpdateWorkoutElementMutation: useUpdateWorkoutElement,
    useDeleteWorkoutElementMutation: useDeleteWorkoutElement,
} = workoutElementsApi;
