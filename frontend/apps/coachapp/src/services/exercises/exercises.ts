import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {CreateExercise, Exercise, ExercisesList, ExercisesListOpts, UpdateExercise} from './exercises_definition';

const buildExerciseListParams = (queryArg: ExercisesListOpts, pageParam: number) => {
    const baseParams = buildListParams(queryArg, pageParam);

    // Convert muscle_ids array to comma-separated string for the API
    if (queryArg.muscle_ids && queryArg.muscle_ids.length > 0) {
        return {
            ...baseParams,
            muscle_ids: queryArg.muscle_ids.join(','),
        };
    }

    return baseParams;
};

export type DuplicateExercise = {
    id: string;
};

export const exercisesApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createExercise: build.mutation<Exercise, CreateExercise>({
            query: (body) => ({
                url: '/api/exercises',
                method: 'post',
                data: body,
            }),
            transformResponse: (response: {data: Exercise}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Exercises', id: result?.id},
                {type: 'Exercises', id: 'LIST'},
            ],
        }),

        getExercise: build.query<Exercise, string>({
            query: (id) => ({
                url: `/api/exercises/${id}`,
                method: 'get',
            }),
            transformResponse: (response: {data: Exercise}) => response.data,
            providesTags: (_result, _error, id) => [{type: 'Exercises', id}],
        }),

        updateExercise: build.mutation<Exercise, UpdateExercise>({
            query: (body) => ({
                url: `/api/exercises/${body.id}`,
                method: 'put',
                data: {
                    ...body,
                    id: undefined,
                },
            }),
            transformResponse: (response: {data: Exercise}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Exercises', id: result?.id},
                {type: 'Exercises', id: 'LIST'},
            ],
        }),

        listExercises: build.infiniteQuery<ExercisesList, ExercisesListOpts, number>({
            query: ({queryArg, pageParam = 0}) => ({
                url: '/api/exercises',
                method: 'get',
                params: buildExerciseListParams(queryArg, pageParam),
            }),
            transformResponse: (response: {data: Exercise[]; meta: ExercisesList['meta']}) => ({
                records: response.data,
                meta: response.meta || {offset: 0, limit: 10, total: response.data.length},
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'Exercises' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [
                    ...records.map((exercise) => ({
                        type: 'Exercises' as const,
                        id: exercise.id,
                    })),
                    ...baseTag,
                ];
            },
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (lastPage) => getNextPage(lastPage),
            },
        }),

        deleteExercise: build.mutation<void, string>({
            query: (id) => ({
                url: `/api/exercises/${id}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'Exercises', id},
                {type: 'Exercises', id: 'LIST'},
            ],
        }),

        duplicateExercise: build.mutation<Exercise, DuplicateExercise>({
            query: ({id}) => ({
                url: `/api/exercises/${id}/duplicate`,
                method: 'post',
            }),
            transformResponse: (response: {data: Exercise}) => response.data,
            invalidatesTags: (result) => [
                {type: 'Exercises', id: result?.id},
                {type: 'Exercises', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateExerciseMutation: useCreateExercise,
    useUpdateExerciseMutation: useUpdateExercise,
    useGetExerciseQuery: useGetExercise,
    useListExercisesInfiniteQuery: useListExercises,
    useDeleteExerciseMutation: useDeleteExercise,
    useDuplicateExerciseMutation: useDuplicateExercise,
} = exercisesApi;
