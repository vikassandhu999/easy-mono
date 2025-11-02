import {baseAPISlice} from '../baseAPISlice';
import {
    type CreateSession,
    type ListSessions,
    type Session,
    type SessionListResponse,
    type UpdateSession,
} from './session_definition';

export const sessionsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        // List session definitions
        listSessions: build.query<SessionListResponse, ListSessions | undefined>({
            query: (queryArg) => ({
                params: queryArg,
                url: '/v1/coach/sessions',
            }),
            providesTags: [{type: 'Sessions', id: 'LIST'}],
        }),

        // Get single session definition
        getSession: build.query<Session, {id: string; options?: {include_contents?: boolean}}>({
            query: ({id, options}) => ({
                params: options,
                url: `/v1/coach/sessions/${id}`,
            }),
            providesTags: (_result, _error, {id}) => [{type: 'Sessions', id}],
        }),

        // Create session definition
        createSession: build.mutation<Session, CreateSession>({
            query: (data) => ({
                data,
                method: 'POST',
                url: '/v1/coach/sessions',
            }),
            invalidatesTags: [{type: 'Sessions', id: 'LIST'}],
        }),

        // Update session definition
        updateSession: build.mutation<Session, {data: UpdateSession; id: string}>({
            query: ({id, data}) => ({
                data,
                method: 'PATCH',
                url: `/v1/coach/sessions/${id}`,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: 'Sessions', id},
                {type: 'Sessions', id: 'LIST'},
            ],
        }),

        // Delete session definition
        deleteSession: build.mutation<void, string>({
            query: (id) => ({
                method: 'DELETE',
                url: `/v1/coach/sessions/${id}`,
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'Sessions', id},
                {type: 'Sessions', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListSessionsQuery,
    useGetSessionQuery,
    useCreateSessionMutation,
    useUpdateSessionMutation,
    useDeleteSessionMutation,
} = sessionsApi;
