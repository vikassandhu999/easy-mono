import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, prospectKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export type Prospect = components['schemas']['Prospect'];
export type ProspectStatus = Prospect['status'];
export type ProspectListResponse = components['schemas']['ProspectListResponse'];
export type ProspectResponse = components['schemas']['ProspectResponse'];
export type ProspectUpdateRequest = components['schemas']['ProspectUpdateRequest'];
export type ProspectEnrollRequest = components['schemas']['ProspectEnrollRequest'];
export type ProspectEnrollResponse = components['schemas']['ProspectEnrollResponse'];

type ListProspectsQuery = NonNullable<paths['/v1/coach/prospects']['get']['parameters']['query']>;

export type ListProspectsParams = Pick<ListProspectsQuery, 'limit' | 'offset' | 'status'>;

export const PROSPECT_STATUS_LABEL: Record<ProspectStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  won: 'Won',
  lost: 'Lost',
};

export const PROSPECT_STATUS_CHIP: Record<ProspectStatus, 'accent' | 'warning' | 'success' | 'default'> = {
  new: 'accent',
  reviewing: 'warning',
  won: 'success',
  lost: 'default',
};

const PAGE_SIZE = 20;

export function useProspectsInfiniteQuery(params?: Pick<ListProspectsParams, 'status'>) {
  return useInfiniteQuery({
    queryKey: prospectKeys.infinite(params),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/prospects', {
          params: {query: {...params, limit: PAGE_SIZE, offset: pageParam}},
        }),
      ) as Promise<ProspectListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useListProspectsQuery(params?: ListProspectsParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: prospectKeys.list(params),
    queryFn: () =>
      call(client.GET('/v1/coach/prospects', {params: {query: params ?? undefined}})) as Promise<ProspectListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useGetProspectQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: prospectKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/prospects/{id}', {params: {path: {id}}})) as Promise<ProspectResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateProspectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: ProspectUpdateRequest; id: string}) =>
      call(client.PATCH('/v1/coach/prospects/{id}', {params: {path: {id}}, body})) as Promise<ProspectResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: prospectKeys.detail(id)});
      qc.invalidateQueries({queryKey: prospectKeys.lists()});
    },
  });
}

export function useEnrollProspectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: ProspectEnrollRequest; id: string}) =>
      call(
        client.POST('/v1/coach/prospects/{id}/enroll', {params: {path: {id}}, body}),
      ) as Promise<ProspectEnrollResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: prospectKeys.detail(id)});
      qc.invalidateQueries({queryKey: prospectKeys.lists()});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}
