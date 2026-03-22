import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

export type Client = {
  id: string;
  email: string;
  first_name: null | string;
  last_name: null | string;
  phone: null | string;
  notes: null | string;
  status: string;
  inserted_at: string;
  updated_at: string;
};

export type ClientInviteRequest = {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  notes?: string;
};

export type ClientUpdateRequest = {
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
  status?: string;
};

export type ListClientsParams = {
  offset?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export const clientsApi = api.injectEndpoints({
  endpoints: (build) => ({
    inviteClient: build.mutation<ApiResponse<Client>, ClientInviteRequest>({
      query: (body) => ({
        url: '/v1/coach/clients/invite',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Client', id: 'LIST'}],
    }),
    getClient: build.query<ApiResponse<Client>, string>({
      query: (id) => `/v1/coach/clients/${id}`,
      providesTags: (_, __, id) => [{type: 'Client', id}],
    }),
    listClients: build.query<ApiListResponse<Client>, ListClientsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/clients',
              params,
            }
          : '/v1/coach/clients',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((client) => ({
                type: 'Client' as const,
                id: client.id,
              })),
              {type: 'Client' as const, id: 'LIST'},
            ]
          : [{type: 'Client' as const, id: 'LIST'}],
    }),
    updateClient: build.mutation<ApiResponse<Client>, {body: ClientUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/clients/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
      ],
    }),
  }),
});

export const {useGetClientQuery, useInviteClientMutation, useListClientsQuery, useUpdateClientMutation} = clientsApi;
