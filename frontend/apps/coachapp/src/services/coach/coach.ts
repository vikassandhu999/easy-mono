import {baseAPISlice} from '../baseAPISlice';
import {
    type AssignmentResponse,
    type Client,
    type ClientsResponse,
    type Coach,
    type CoachResponse,
    type MessageResponse,
    UpdateCoach_zod,
    type UpdateCoachProps,
} from './coach_definition';

export const coachApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        // GET /api/coaches/:id - Get coach details
        getCoach: build.query<Coach, string>({
            query: (id) => ({
                url: `/api/coaches/${id}`,
                method: 'GET',
            }),
            transformResponse: (response: CoachResponse) => response.coach,
            providesTags: (_, __, id) => [{type: 'Coach', id}],
        }),

        // PATCH /api/coaches/:id - Update coach profile
        updateCoach: build.mutation<Coach, {id: string; data: UpdateCoachProps}>({
            query: ({id, data}) => {
                const validatedData = UpdateCoach_zod.parse(data);
                return {
                    url: `/api/coaches/${id}`,
                    method: 'PATCH',
                    data: validatedData,
                };
            },
            transformResponse: (response: CoachResponse) => response.coach,
            invalidatesTags: (_, __, {id}) => [{type: 'Coach', id}],
        }),

        // GET /api/coaches/:id/clients - List coach's assigned clients
        getCoachClients: build.query<Client[], string>({
            query: (id) => ({
                url: `/api/coaches/${id}/clients`,
                method: 'GET',
            }),
            transformResponse: (response: ClientsResponse) => response.clients,
            providesTags: (_, __, id) => [
                {type: 'Coach', id: `${id}-clients`},
                {type: 'Clients', id: 'LIST'},
            ],
        }),

        // POST /api/coaches/:id/clients/:client_id/assign - Assign client to coach
        assignClientToCoach: build.mutation<AssignmentResponse, {coachId: string; clientId: string}>({
            query: ({coachId, clientId}) => ({
                url: `/api/coaches/${coachId}/clients/${clientId}/assign`,
                method: 'POST',
            }),
            invalidatesTags: (_, __, {coachId, clientId}) => [
                {type: 'Coach', id: `${coachId}-clients`},
                {type: 'Clients', id: clientId},
            ],
        }),

        // DELETE /api/coaches/:id/clients/:client_id/unassign - Unassign client from coach
        unassignClientFromCoach: build.mutation<MessageResponse, {coachId: string; clientId: string}>({
            query: ({coachId, clientId}) => ({
                url: `/api/coaches/${coachId}/clients/${clientId}/unassign`,
                method: 'DELETE',
            }),
            invalidatesTags: (_, __, {coachId, clientId}) => [
                {type: 'Coach', id: `${coachId}-clients`},
                {type: 'Clients', id: clientId},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetCoachQuery,
    useUpdateCoachMutation,
    useGetCoachClientsQuery,
    useAssignClientToCoachMutation,
    useUnassignClientFromCoachMutation,
} = coachApi;
