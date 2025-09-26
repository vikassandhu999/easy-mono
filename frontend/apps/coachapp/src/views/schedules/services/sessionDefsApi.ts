import type {
    CreateSessionDef,
    GetSessionDefItemsResponse,
    ListSessionDefs,
    SessionDef,
    SessionDefListResponse,
    UpdateSessionDef,
    UpdateSessionDefItemsInput,
    UpdateSessionDefItemsResponse,
} from '../../../api/session_defs';

import {apiSlice} from '../../../store/services/apiSlice';

export const sessionDefsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // List session definitions with infinite query support
        listSessionDefs: builder.query<SessionDefListResponse, {params?: ListSessionDefs}>({
            query: ({params}) => ({
                url: '/v1/coach/sessiondefs',
                params,
            }),
            providesTags: (result) => [
                {type: 'SessionDefs', id: 'LIST'},
                ...(result?.records?.map((sessionDef) => ({
                    type: 'SessionDefs' as const,
                    id: sessionDef.id,
                })) || []),
            ],
        }),

        // Get single session definition
        getSessionDef: builder.query<
            SessionDef,
            {id: string; params?: {include_contents?: boolean; include_template?: boolean}}
        >({
            query: ({id, params}) => ({
                url: `/v1/coach/sessiondefs/${id}`,
                params,
            }),
            providesTags: (_result, _error, {id}) => [{type: 'SessionDefs', id}],
        }),

        // Get session definition items
        getSessionDefItems: builder.query<
            GetSessionDefItemsResponse,
            {params?: {include_contents?: boolean}; sessionDefId: string}
        >({
            query: ({params, sessionDefId}) => ({
                url: `/v1/coach/sessiondefs/${sessionDefId}/items`,
                params,
            }),
            providesTags: (_result, _error, {sessionDefId}) => [{type: 'SessionDefs', id: `${sessionDefId}_ITEMS`}],
        }),

        // Create session definition
        createSessionDef: builder.mutation<SessionDef, {data: CreateSessionDef}>({
            query: ({data}) => ({
                url: '/v1/coach/sessiondefs',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: () => [{type: 'SessionDefs', id: 'LIST'}],
        }),

        // Update session definition
        updateSessionDef: builder.mutation<SessionDef, {data: UpdateSessionDef; id: string}>({
            query: ({data, id}) => ({
                url: `/v1/coach/sessiondefs/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'SessionDefs', id},
                {type: 'SessionDefs', id: 'LIST'},
            ],
        }),

        // Update session definition items
        updateSessionDefItems: builder.mutation<
            UpdateSessionDefItemsResponse,
            {data: UpdateSessionDefItemsInput; sessionDefId: string}
        >({
            query: ({data, sessionDefId}) => ({
                url: `/v1/coach/sessiondefs/${sessionDefId}/items`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, {sessionDefId}) => [
                {type: 'SessionDefs', id: sessionDefId},
                {type: 'SessionDefs', id: `${sessionDefId}_ITEMS`},
                {type: 'SessionDefs', id: 'LIST'},
            ],
        }),

        // Delete session definition
        deleteSessionDef: builder.mutation<{message: string}, {id: string}>({
            query: ({id}) => ({
                url: `/v1/coach/sessiondefs/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'SessionDefs', id},
                {type: 'SessionDefs', id: 'LIST'},
            ],
        }),
    }),
});

export const {
    useCreateSessionDefMutation,
    useDeleteSessionDefMutation,
    useGetSessionDefItemsQuery,
    useGetSessionDefQuery,
    useListSessionDefsQuery,
    useUpdateSessionDefItemsMutation,
    useUpdateSessionDefMutation,
} = sessionDefsApi;
