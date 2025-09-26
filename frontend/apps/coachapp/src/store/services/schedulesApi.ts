import {
    type AssignScheduleProps,
    type CopyToClientProps,
    type CreateScheduleProps,
    type ListSchedulesParams,
    type ListSchedulesResult,
    type Schedule,
    type ScheduleCategory,
    type UpdateScheduleProps,
} from '@/api/schedules.ts';

import {apiSlice} from './apiSlice';

type ListSchedulesQueryParams = Omit<ListSchedulesParams, 'page'> | undefined;

const DEFAULT_PAGE_SIZE = 20;

const buildScheduleListParams = (queryArg: ListSchedulesQueryParams, pageParam: number) => {
    const params: Record<string, unknown> = {
        ...(queryArg ?? {}),
        page: pageParam,
    };

    if (!('page_size' in params) || typeof params.page_size !== 'number') {
        params.page_size = DEFAULT_PAGE_SIZE;
    }

    return params;
};

const getNextSchedulePage = (lastPage: ListSchedulesResult, lastPageParam: number) => {
    const currentPage = lastPage.page ?? lastPageParam;
    const pageSize = lastPage.page_size ?? DEFAULT_PAGE_SIZE;

    if (!pageSize || pageSize <= 0) {
        return undefined;
    }

    if (typeof lastPage.total === 'number') {
        if (lastPage.total <= 0) {
            return undefined;
        }

        const totalPages = Math.ceil(lastPage.total / pageSize);

        if (currentPage >= totalPages) {
            return undefined;
        }

        return currentPage + 1;
    }

    if (lastPage.records.length < pageSize) {
        return undefined;
    }

    return currentPage + 1;
};

export const schedulesApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        listSchedules: build.infiniteQuery<ListSchedulesResult, ListSchedulesQueryParams, number>({
            query: ({queryArg, pageParam = 1}) => ({
                url: '/v1/coach/schedules',
                method: 'get',
                params: buildScheduleListParams(queryArg, pageParam),
            }),
            serializeQueryArgs: ({queryArgs}) => JSON.stringify(queryArgs ?? {}),
            providesTags: (result) => {
                const baseTag = [{type: 'Schedules' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((schedule) => ({type: 'Schedules' as const, id: schedule.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) => getNextSchedulePage(lastPage, lastPageParam),
            },
        }),
        listSchedulesByCategory: build.infiniteQuery<
            ListSchedulesResult,
            {category: ScheduleCategory; params?: ListSchedulesQueryParams},
            number
        >({
            query: ({queryArg, pageParam = 1}) => ({
                url: `/v1/coach/schedules/category/${queryArg.category}`,
                method: 'get',
                params: buildScheduleListParams(queryArg.params, pageParam),
            }),
            serializeQueryArgs: ({queryArgs}) => JSON.stringify(queryArgs ?? {}),
            providesTags: (result) => {
                const baseTag = [{type: 'Schedules' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((schedule) => ({type: 'Schedules' as const, id: schedule.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) => getNextSchedulePage(lastPage, lastPageParam),
            },
        }),
        listTemplateSchedules: build.infiniteQuery<ListSchedulesResult, ListSchedulesQueryParams, number>({
            query: ({queryArg, pageParam = 1}) => ({
                url: '/v1/coach/schedules/templates',
                method: 'get',
                params: buildScheduleListParams(queryArg, pageParam),
            }),
            serializeQueryArgs: ({queryArgs}) => JSON.stringify(queryArgs ?? {}),
            providesTags: (result) => {
                const baseTag = [{type: 'Schedules' as const, id: 'TEMPLATES'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((schedule) => ({type: 'Schedules' as const, id: schedule.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) => getNextSchedulePage(lastPage, lastPageParam),
            },
        }),
        listProgramSchedules: build.query<
            ListSchedulesResult,
            {params?: {page?: number; page_size?: number}; programId: string}
        >({
            query: ({programId, params}) => ({
                url: `/v1/coach/programs/${programId}/schedules`,
                method: 'get',
                params,
            }),
            providesTags: (result, _error, {programId}) => {
                const baseTag = [{type: 'Schedules' as const, id: `PROGRAM-${programId}`}];

                if (!result) {
                    return baseTag;
                }

                return [
                    ...result.records.map((schedule) => ({type: 'Schedules' as const, id: schedule.id})),
                    ...baseTag,
                ];
            },
        }),
        getSchedule: build.query<Schedule, string>({
            query: (scheduleId) => ({
                url: `/v1/coach/schedules/${scheduleId}`,
                method: 'get',
            }),
            providesTags: (_result, _error, scheduleId) => [{type: 'Schedules', id: scheduleId}],
        }),
        createSchedule: build.mutation<Schedule, CreateScheduleProps>({
            query: (body) => ({
                url: '/v1/coach/schedules',
                method: 'post',
                data: body,
            }),
            invalidatesTags: [{type: 'Schedules', id: 'LIST'}],
        }),
        createProgramSchedule: build.mutation<Schedule, {data: CreateScheduleProps; programId: string}>({
            query: ({programId, data}) => ({
                url: `/v1/coach/programs/${programId}/schedules`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, {programId}) => [
                {type: 'Schedules', id: 'LIST'},
                {type: 'Schedules', id: `PROGRAM-${programId}`},
            ],
        }),
        updateSchedule: build.mutation<Schedule, {data: UpdateScheduleProps; scheduleId: string}>({
            query: ({scheduleId, data}) => ({
                url: `/v1/coach/schedules/${scheduleId}`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, {scheduleId}) => [
                {type: 'Schedules', id: scheduleId},
                {type: 'Schedules', id: 'LIST'},
            ],
        }),
        deleteSchedule: build.mutation<{message: string}, string>({
            query: (scheduleId) => ({
                url: `/v1/coach/schedules/${scheduleId}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, scheduleId) => [
                {type: 'Schedules', id: scheduleId},
                {type: 'Schedules', id: 'LIST'},
            ],
        }),
        assignSchedule: build.mutation<Schedule, {data: AssignScheduleProps; scheduleId: string}>({
            query: ({scheduleId, data}) => ({
                url: `/v1/coach/schedules/${scheduleId}/assign`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, {scheduleId}) => [
                {type: 'Schedules', id: scheduleId},
                {type: 'Schedules', id: 'LIST'},
            ],
        }),
        copyScheduleToClient: build.mutation<Schedule, {data: CopyToClientProps; scheduleId: string}>({
            query: ({scheduleId, data}) => ({
                url: `/v1/coach/schedules/${scheduleId}/copy-to-client`,
                method: 'post',
                data,
            }),
            invalidatesTags: [{type: 'Schedules', id: 'LIST'}],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListSchedulesInfiniteQuery,
    useListSchedulesByCategoryInfiniteQuery,
    useListTemplateSchedulesInfiniteQuery,
    useListProgramSchedulesQuery,
    useGetScheduleQuery,
    useCreateScheduleMutation,
    useCreateProgramScheduleMutation,
    useUpdateScheduleMutation,
    useDeleteScheduleMutation,
    useAssignScheduleMutation,
    useCopyScheduleToClientMutation,
} = schedulesApi;
