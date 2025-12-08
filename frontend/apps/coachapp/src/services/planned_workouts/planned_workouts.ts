import {baseAPISlice} from '../baseAPISlice';
import {type DayName, type DayOfWeek} from '../training_plans/training_plans_definition';
import {WorkoutElement} from '../workout_elements';

export type PlannedWorkout = {
    id: string;
    name: string;
    notes: null | string;
    day_number: DayOfWeek; // 1-7 representing Monday-Sunday
    day_name: DayName; // Human-readable day name
    training_plan_id: string;
    elements: WorkoutElement[];
    inserted_at?: string;
    updated_at?: string;
};

export type CreatePlannedWorkout = {
    training_plan_id: string;
    name: string;
    day_number: DayOfWeek; // 1-7 representing Monday-Sunday
    notes?: null | string;
};

export type UpdatePlannedWorkout = {
    id: string;
    name?: string;
    notes?: null | string;
    day_number?: DayOfWeek;
};

export const plannedWorkoutsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createPlannedWorkout: build.mutation<PlannedWorkout, CreatePlannedWorkout>({
            query: (body) => ({
                url: '/api/coach/planned_workouts',
                method: 'post',
                data: {planned_workout: body},
            }),
            transformResponse: (response: {data: PlannedWorkout}) => response.data,
            invalidatesTags: ['TrainingPlans'],
        }),

        getPlannedWorkout: build.query<PlannedWorkout, string>({
            query: (id) => ({
                url: `/api/coach/planned_workouts/${id}`,
                method: 'get',
            }),
            transformResponse: (response: {data: PlannedWorkout}) => response.data,
        }),

        updatePlannedWorkout: build.mutation<PlannedWorkout, UpdatePlannedWorkout>({
            query: (body) => ({
                url: `/api/coach/planned_workouts/${body.id}`,
                method: 'put',
                data: {
                    planned_workout: {
                        ...body,
                        id: undefined,
                    },
                },
            }),
            transformResponse: (response: {data: PlannedWorkout}) => response.data,
            invalidatesTags: ['TrainingPlans'],
        }),

        deletePlannedWorkout: build.mutation<void, string>({
            query: (id) => ({
                url: `/api/coach/planned_workouts/${id}`,
                method: 'delete',
            }),
            invalidatesTags: ['TrainingPlans'],
        }),
    }),
});

export const {
    useCreatePlannedWorkoutMutation: useCreatePlannedWorkout,
    useGetPlannedWorkoutQuery: useGetPlannedWorkout,
    useUpdatePlannedWorkoutMutation: useUpdatePlannedWorkout,
    useDeletePlannedWorkoutMutation: useDeletePlannedWorkout,
} = plannedWorkoutsApi;
