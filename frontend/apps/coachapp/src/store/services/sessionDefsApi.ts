import {
    type CreateSessionDef,
    type ListSessionDefs,
    type SessionDef,
    type SessionDefListResponse,
    type UpdateSessionDef,
} from '@/api/session_defs.ts';

import {apiSlice} from './apiSlice';

export const sessionDefsApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        // List session definitions
        listSessionDefs: build.query<SessionDefListResponse, ListSessionDefs | undefined>({
            query: (queryArg) => ({
                params: queryArg,
                url: '/v1/coach/session-defs',
            }),
            providesTags: [{type: 'SessionDefs', id: 'LIST'}],
        }),

        // List session definitions with infinite scrolling
        listSessionDefsInfinite: build.infiniteQuery<
            SessionDefListResponse,
            Omit<ListSessionDefs, 'page'> | undefined,
            number | undefined
        >({
            query: ({queryArg, pageParam}) => ({
                params: {
                    ...queryArg,
                    page: pageParam || 1,
                },
                url: '/v1/coach/session-defs',
            }),
            providesTags: [{type: 'SessionDefs', id: 'LIST'}],
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage) => {
                    return lastPage.records.length === lastPage.page_size ? lastPage.page + 1 : undefined;
                },
            },
        }),

        // Get single session definition
        getSessionDef: build.query<
            SessionDef,
            {id: string; options?: {include_contents?: boolean; include_template?: boolean}}
        >({
            query: ({id, options}) => ({
                params: options,
                url: `/v1/coach/session-defs/${id}`,
            }),
            providesTags: (_result, _error, {id}) => [{type: 'SessionDefs', id}],
        }),

        // Create session definition
        createSessionDef: build.mutation<SessionDef, CreateSessionDef>({
            query: (data) => ({
                body: data,
                method: 'POST',
                url: '/v1/coach/session-defs',
            }),
            invalidatesTags: [{type: 'SessionDefs', id: 'LIST'}],
        }),

        // Update session definition
        updateSessionDef: build.mutation<SessionDef, {data: UpdateSessionDef; id: string}>({
            query: ({id, data}) => ({
                body: data,
                method: 'PUT',
                url: `/v1/coach/session-defs/${id}`,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'SessionDefs', id},
                {type: 'SessionDefs', id: 'LIST'},
            ],
        }),

        // Delete session definition
        deleteSessionDef: build.mutation<void, string>({
            query: (id) => ({
                method: 'DELETE',
                url: `/v1/coach/session-defs/${id}`,
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'SessionDefs', id},
                {type: 'SessionDefs', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListSessionDefsQuery,
    useGetSessionDefQuery,
    useCreateSessionDefMutation,
    useUpdateSessionDefMutation,
    useDeleteSessionDefMutation,
} = sessionDefsApi;
