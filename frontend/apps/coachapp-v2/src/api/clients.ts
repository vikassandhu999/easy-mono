import {api} from '@/api';
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
    }),
    getClient: build.query<ApiResponse<Client>, string>({
      query: (id) => `/v1/coach/clients/${id}`,
    }),
    listClients: build.query<ApiListResponse<Client>, ListClientsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/clients',
              params,
            }
          : '/v1/coach/clients',
    }),
  }),
});

export const {useGetClientQuery, useInviteClientMutation, useListClientsQuery} = clientsApi;
