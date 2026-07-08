import {api} from '@/api/base';
import type {
  DeactivateTrainerApiArg,
  InviteTrainerApiArg,
  ReassignClientApiArg,
  ResendTrainerInviteApiArg,
  RevokeTrainerInviteApiArg,
  TeamMemberResponse,
  TeamResponse,
} from '@/api/generated';

export type {TeamMember} from '@/api/generated';

const teamApi = api.injectEndpoints({
  // Hand-managed endpoints (cache tags) that share names with the generated
  // client — override makes these authoritative regardless of import order.
  overrideExisting: true,
  endpoints: (build) => ({
    getTeam: build.query<TeamResponse, void>({
      query: () => '/v1/coach/team',
      providesTags: [{type: 'Team', id: 'LIST'}],
    }),
    inviteTrainer: build.mutation<TeamMemberResponse, InviteTrainerApiArg['trainerInviteRequest']>({
      query: (body) => ({
        url: '/v1/coach/team/invite',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Team', id: 'LIST'}],
    }),
    resendTrainerInvite: build.mutation<TeamMemberResponse, ResendTrainerInviteApiArg['id']>({
      query: (id) => ({
        url: `/v1/coach/team/${id}/resend-invite`,
        method: 'POST',
      }),
      invalidatesTags: [{type: 'Team', id: 'LIST'}],
    }),
    revokeTrainerInvite: build.mutation<TeamMemberResponse, RevokeTrainerInviteApiArg['id']>({
      query: (id) => ({
        url: `/v1/coach/team/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{type: 'Team', id: 'LIST'}],
    }),
    deactivateTrainer: build.mutation<TeamMemberResponse, DeactivateTrainerApiArg['id']>({
      query: (id) => ({
        url: `/v1/coach/team/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: [
        {type: 'Team', id: 'LIST'},
        {type: 'Client', id: 'LIST'},
      ],
    }),
    reassignClient: build.mutation<void, {clientId: string; body: ReassignClientApiArg['reassignClientRequest']}>({
      query: ({clientId, body}) => ({
        url: `/v1/coach/clients/${clientId}/reassign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, {clientId}) => [
        {type: 'Client', id: clientId},
        {type: 'Client', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useGetTeamQuery,
  useInviteTrainerMutation,
  useResendTrainerInviteMutation,
  useRevokeTrainerInviteMutation,
  useDeactivateTrainerMutation,
  useReassignClientMutation,
} = teamApi;
