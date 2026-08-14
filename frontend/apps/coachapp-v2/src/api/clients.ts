import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {billingKeys, clientKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {ApiResponse} from '@/api/shared';
import {workbenchMutationTargets} from '@/api/workbench-targets';

const PAGE_SIZE = 20;

type GeneratedClient = components['schemas']['Client'];

export type ClientStatus = GeneratedClient['status'];
export type Client = GeneratedClient;
export type ClientInviteRequest = components['schemas']['ClientInviteRequest'];
export type RequiredServices = components['schemas']['RequiredServices'];
export type RequiredServicesNonEmpty = components['schemas']['RequiredServicesNonEmpty'];
export type RequiredService = RequiredServices[number];

/**
 * Status values the coach can set via PATCH. `pending` is intentionally absent:
 *   - The only transition into `pending` is creating an invitation.
 *   - The only transition out of `pending` is the client accepting (server-driven).
 *   - All other transitions happen between active/inactive.
 */
export type AllowedUpdateStatus = Exclude<ClientStatus, 'pending'>;

export type ClientUpdateRequest = Omit<components['schemas']['ClientUpdateRequest'], 'status'> & {
  status?: AllowedUpdateStatus;
};

export type ClientSummary = {
  active: number;
  inactive: number;
  pending: number;
};

export type ClientListResponse = {
  count: number;
  data: Client[];
  summary: ClientSummary;
};

type ListClientsQuery = NonNullable<paths['/v1/coach/clients']['get']['parameters']['query']>;

export type ListClientsParams = Pick<ListClientsQuery, 'include_plans' | 'limit' | 'offset' | 'search' | 'status'>;

export type ListClientsFilters = Pick<ListClientsQuery, 'search' | 'sort' | 'status'>;

export function useGetClientQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/clients/{id}', {params: {path: {id}}})) as Promise<ApiResponse<Client>>,
    enabled: options?.enabled ?? true,
  });
}

export function useListClientsQuery(params?: ListClientsParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () =>
      call(client.GET('/v1/coach/clients', {params: {query: params ?? undefined}})) as Promise<ClientListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useClientsInfiniteQuery(filters?: ListClientsFilters, options?: {enabled?: boolean}) {
  return useInfiniteQuery({
    queryKey: clientKeys.infinite(filters),
    enabled: options?.enabled ?? true,
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/clients', {
          params: {
            query: {
              ...(filters?.search && {search: filters.search}),
              ...(filters?.status && {status: filters.status}),
              ...(filters?.sort && {sort: filters.sort}),
              // The CL row's plan chips. Opt-in on the endpoint because the names
              // cost two extra queries per page; this list is the one caller that
              // renders them.
              include_plans: true,
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ) as Promise<ClientListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useInviteClientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientInviteRequest) =>
      call(client.POST('/v1/coach/clients/invite', {body})) as Promise<ApiResponse<Client>>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
      qc.invalidateQueries({queryKey: billingKeys.all});
    },
  });
}

export function useResendClientInviteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.POST('/v1/coach/clients/{id}/resend-invite', {params: {path: {id}}})) as Promise<ApiResponse<Client>>,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({queryKey: clientKeys.detail(id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
    },
  });
}

export function useRevokeClientInviteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/clients/{id}', {params: {path: {id}}})),
    onSuccess: (_data, id) => {
      qc.removeQueries({queryKey: clientKeys.detail(id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
      qc.invalidateQueries({queryKey: billingKeys.all});
    },
  });
}

export function useUpdateClientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: ClientUpdateRequest; id: string}) =>
      call(client.PATCH('/v1/coach/clients/{id}', {params: {path: {id}}, body})) as Promise<ApiResponse<Client>>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: clientKeys.detail(id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      for (const queryKey of workbenchMutationTargets().afterMembershipChange) {
        qc.invalidateQueries({queryKey: [...queryKey]});
      }
      qc.invalidateQueries({queryKey: billingKeys.all});
    },
  });
}

export type WeightEntry = components['schemas']['WeightEntry'];

export function useListClientWeightEntriesQuery(clientId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.weightEntries(clientId),
    queryFn: () =>
      call(client.GET('/v1/coach/clients/{client_id}/weight_entries', {params: {path: {client_id: clientId}}})),
    enabled: options?.enabled ?? true,
  });
}
