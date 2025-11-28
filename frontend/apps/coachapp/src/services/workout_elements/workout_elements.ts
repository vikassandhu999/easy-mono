import {baseAPISlice} from '../baseAPISlice';

export type PlannedSet = {
    id?: string;
    position: number;
    reps_min: null | number;
    reps_max: null | number;
    load_value: null | number;
    load_type: null | string;
    rest_seconds: null | number;
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
    sets?: Omit<PlannedSet, 'id'>[];
};

export type UpdateWorkoutElement = {
    id: string;
    position?: number;
    superset_group_id?: null | string;
    notes?: null | string;
    sets?: Omit<PlannedSet, 'id'>[];
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
