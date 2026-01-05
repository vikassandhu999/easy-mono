import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {
  type Client,
  type ClientsList,
  type ClientsListOpts,
  type InviteClientProps,
  type InviteClientResponse,
  type UpdateClientProps,
  type UpdateClientStatusProps,
} from './client_definition';

export const clientsApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/clients - List clients with filters and pagination
    listClients: build.infiniteQuery<ClientsList, ClientsListOpts, number>({
      query: ({queryArg, pageParam = 0}) => ({
        url: '/api/coach/clients',
        method: 'get',
        params: buildListParams(queryArg, pageParam),
      }),
      transformResponse: (response: {
        clients: Client[];
        pagination: {total: number; limit: number; offset: number};
      }) => ({
        records: response.clients,
        meta: {
          offset: response.pagination.offset,
          limit: response.pagination.limit,
          total: response.pagination.total,
        },
      }),
      providesTags: (result) => {
        const baseTag = [{type: 'Clients' as const, id: 'LIST'}];

        if (!result) {
          return baseTag;
        }

        const records = result.pages.flatMap((page) => page.records);

        if (records.length === 0) {
          return baseTag;
        }

        return [...records.map((client) => ({type: 'Clients' as const, id: client.id})), ...baseTag];
      },
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPage(lastPage),
      },
    }),

    // GET /api/clients/:id - Get client details
    getClient: build.query<Client, string>({
      query: (clientId) => ({
        url: `/api/coach/clients/${clientId}`,
        method: 'get',
      }),
      transformResponse: (response: {client: Client}) => response.client,
      providesTags: (_result, _error, clientId) => [{type: 'Clients', id: clientId}],
    }),

    // POST /api/clients/invite - Invite a new client
    inviteClient: build.mutation<InviteClientResponse, InviteClientProps>({
      query: (body) => ({
        url: '/api/coach/clients/invite',
        method: 'post',
        data: body,
      }),
      invalidatesTags: [{type: 'Clients', id: 'LIST'}],
    }),

    // PATCH /api/clients/:id - Update client details
    updateClient: build.mutation<Client, {clientId: string; data: UpdateClientProps}>({
      query: ({clientId, data}) => ({
        url: `/api/coach/clients/${clientId}`,
        method: 'patch',
        data,
      }),
      transformResponse: (response: {client: Client}) => response.client,
      invalidatesTags: (_result, _error, arg) => [
        {type: 'Clients', id: arg.clientId},
        {type: 'Clients', id: 'LIST'},
      ],
    }),

    // PATCH /api/clients/:id/status - Update client status
    updateClientStatus: build.mutation<Client, UpdateClientStatusProps & {clientId: string}>({
      query: ({clientId, status}) => ({
        url: `/api/coach/clients/${clientId}/status`,
        method: 'patch',
        data: {status},
      }),
      transformResponse: (response: {client: Client}) => response.client,
      invalidatesTags: (_result, _error, arg) => [
        {type: 'Clients', id: arg.clientId},
        {type: 'Clients', id: 'LIST'},
      ],
    }),

    // POST /api/clients/:id/resend-invitation - Resend invitation email
    resendInvitation: build.mutation<Client, string>({
      query: (clientId) => ({
        url: `/api/coach/clients/${clientId}/resend-invitation`,
        method: 'post',
      }),
      transformResponse: (response: {client: Client}) => response.client,
      invalidatesTags: (_result, _error, clientId) => [
        {type: 'Clients', id: clientId},
        {type: 'Clients', id: 'LIST'},
      ],
    }),

    // DELETE /api/clients/:id - Archive client
    archiveClient: build.mutation<Client, string>({
      query: (clientId) => ({
        url: `/api/coach/clients/${clientId}`,
        method: 'delete',
      }),
      transformResponse: (response: {client: Client}) => response.client,
      invalidatesTags: (_result, _error, clientId) => [
        {type: 'Clients', id: clientId},
        {type: 'Clients', id: 'LIST'},
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListClientsInfiniteQuery: useListClients,
  useGetClientQuery: useGetClient,
  useInviteClientMutation: useInviteClient,
  useUpdateClientMutation: useUpdateClient,
  useUpdateClientStatusMutation: useUpdateClientStatus,
  useResendInvitationMutation: useResendInvitation,
  useArchiveClientMutation: useArchiveClient,
} = clientsApi;
