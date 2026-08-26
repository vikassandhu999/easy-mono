import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import type {Client, ClientIndex, ClientInvite, ClientUpdate, paths, WeightEntryIndex} from '@/api/schema';

import {call, client} from './client.ts';
import {billingKeys, clientKeys} from './keys.ts';
import {omitUndefined} from './shared.ts';
import {workbenchMutationTargets} from './workbench-targets.ts';

const PAGE_SIZE = 20;

export type {Client} from '@/api/schema';

export type ClientStatus = Client['status'];
export type ClientInviteRequest = ClientInvite;
export type RequiredServices = Client['required_services'];
export type RequiredService = RequiredServices[number];
export type RequiredServicesNonEmpty = [RequiredService, ...RequiredService[]];

/**
 * Status values the coach can set via PATCH. `pending` is intentionally absent:
 *   - The only transition into `pending` is creating an invitation.
 *   - The only transition out of `pending` is the client accepting (server-driven).
 *   - All other transitions happen between active/inactive.
 */
export type AllowedUpdateStatus = Exclude<ClientUpdate['status'], undefined>;
export type ClientUpdateRequest = ClientUpdate;

export type ClientSummary = ClientIndex['summary'];
export type ClientListResponse = ClientIndex;
export type ClientResponse = paths['/v1/coach/clients/{id}']['get']['responses'][200]['content']['application/json'];

type ListClientsQuery = NonNullable<paths['/v1/coach/clients']['get']['parameters']['query']>;

export type ListClientsParams = Pick<ListClientsQuery, 'include_plans' | 'limit' | 'offset' | 'search' | 'status'>;

export type ListClientsFilters = Pick<ListClientsQuery, 'search' | 'sort' | 'status'>;

export function useGetClientQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/clients/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useListClientsQuery(params?: ListClientsParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => call(client.GET('/v1/coach/clients', params ? {params: {query: omitUndefined(params)}} : {})),
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
      ),
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
    mutationFn: (body: ClientInviteRequest) => call(client.POST('/v1/coach/clients/invite', {body})),
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
    mutationFn: (id: string) => call(client.POST('/v1/coach/clients/{id}/resend-invite', {params: {path: {id}}})),
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
      call(client.PATCH('/v1/coach/clients/{id}', {params: {path: {id}}, body})),
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

export type {WeightEntry} from './schema.ts';

/**
 * The goal weight off a weight-entries response.
 *
 * The contract types `goal` as `{[key: string]: unknown} | null` — the backend
 * does not spec its shape — so the value is CHECKED here rather than asserted
 * `as number` at each of the three screens that draw the goal rule.
 */
export function goalWeightValue(response: Pick<WeightEntryIndex, 'goal'> | undefined): null | number {
  const value = Number(response?.goal?.value);
  return Number.isFinite(value) ? value : null;
}

export function useListClientWeightEntriesQuery(clientId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: clientKeys.weightEntries(clientId),
    queryFn: () =>
      call(client.GET('/v1/coach/clients/{client_id}/weight_entries', {params: {path: {client_id: clientId}}})),
    enabled: options?.enabled ?? true,
  });
}
