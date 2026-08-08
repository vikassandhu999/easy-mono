import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {billingKeys, clientKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

type GeneratedClient = components['schemas']['Client'];

export type ClientStatus = GeneratedClient['status'];

export type Client = {
  id: string;
  email: null | string;
  /**
   * User-authoritative when the Client is linked to a User (any status except
   * `pending`). For pending clients, this is the coach-set invite value.
   */
  first_name: null | string;
  /** See first_name — same User-wins-then-fallback rule applies. */
  last_name: null | string;
  phone: null | string;
  notes: null | string;
  status: ClientStatus;
  goal_weight_unit: GeneratedClient['goal_weight_unit'];
  goal_weight_value: GeneratedClient['goal_weight_value'];
  /** 'onboarding' until the client's first plan assignment auto-advances it to 'coaching'. */
  stage: GeneratedClient['stage'];
  /** Populated only when status is 'inactive'. */
  inactive_reason: GeneratedClient['inactive_reason'];
  subscription_started_on: null | string;
  subscription_ends_on: null | string;
  intake_incomplete: boolean;
  needs_plan: boolean;
  expiring_soon: boolean;
  /** Active client with no plan in force, or coverage ending within 3 days with no successor. */
  needs_programming: boolean;
  /** Last day either discipline has an active plan scheduled through; null when neither does. */
  covered_until: null | string;
  /** Present only when the list request passes include_plans=true. */
  nutrition_plan_name?: GeneratedClient['nutrition_plan_name'];
  /** Present only when the list request passes include_plans=true. */
  training_plan_name?: GeneratedClient['training_plan_name'];
  /**
   * UTC time of the client's latest successful workout completion, food log,
   * check-in submission, or weight upsert. Null when they never have. Not
   * `updated_at`, which moves when a coach edits the row.
   */
  last_active_at: GeneratedClient['last_active_at'];
  /** The trainer this client is currently assigned to. */
  assigned_coach_id: null | string;
  /** Present only for pending clients. */
  invite_url: null | string;
  /**
   * Timestamp of when the invitation was created or last resent.
   * Present only for pending clients.
   */
  invitation_sent_at: null | string;
  /**
   * invitation_sent_at + 30 days. Present only for pending clients.
   */
  invitation_expires_at: null | string;
  inserted_at: string;
  updated_at: string;
};

export type ClientInviteRequest = {
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
};

/**
 * Status values the coach can set via PATCH. `pending` is intentionally absent:
 *   - The only transition into `pending` is creating an invitation.
 *   - The only transition out of `pending` is the client accepting (server-driven).
 *   - All other transitions happen between active/inactive.
 */
export type AllowedUpdateStatus = Exclude<ClientStatus, 'pending'>;

export type ClientUpdateRequest = {
  email?: null | string;
  first_name?: string;
  last_name?: string;
  notes?: null | string;
  phone?: null | string;
  stage?: GeneratedClient['stage'];
  status?: AllowedUpdateStatus;
  subscription_ends_on?: null | string;
  subscription_started_on?: null | string;
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

export type ListClientsFilters = Pick<ListClientsQuery, 'filter' | 'search' | 'sort' | 'status'>;

/** One workbench client queue (the check-ins queue has its own endpoint). */
export type ClientQueue = NonNullable<ListClientsQuery['filter']>;

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
              ...(filters?.filter && {filter: filters.filter}),
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
