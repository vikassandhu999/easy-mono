import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {clientKeys, teamKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type TeamMember = components['schemas']['TeamMember'];
export type TeamResponse = components['schemas']['TeamResponse'];
export type TeamMemberResponse = components['schemas']['TeamMemberResponse'];
export type TrainerInviteRequest = components['schemas']['TrainerInviteRequest'];
export type ReassignClientRequest = components['schemas']['ReassignClientRequest'];

export function useGetTeamQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => call(client.GET('/v1/coach/team')),
    enabled: options?.enabled ?? true,
  });
}

export function useInviteTrainerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainerInviteRequest) =>
      call(client.POST('/v1/coach/team/invite', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: teamKeys.all});
    },
  });
}

export function useResendTrainerInviteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.POST('/v1/coach/team/{id}/resend-invite', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: teamKeys.all});
    },
  });
}

export function useRevokeTrainerInviteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.DELETE('/v1/coach/team/{id}', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: teamKeys.all});
    },
  });
}

export function useDeactivateTrainerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.POST('/v1/coach/team/{id}/deactivate', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: teamKeys.all});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}

export function useReactivateTrainerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(client.POST('/v1/coach/team/{id}/reactivate', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: teamKeys.all});
    },
  });
}

export function useReassignClientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({clientId, body}: {clientId: string; body: ReassignClientRequest}) =>
      call(client.POST('/v1/coach/clients/{id}/reassign', {params: {path: {id: clientId}}, body})),
    onSuccess: (_data, {clientId}) => {
      qc.invalidateQueries({queryKey: clientKeys.detail(clientId)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    },
  });
}
