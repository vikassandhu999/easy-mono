import {coachApi, type Prospect} from '@/api/generated';
import {listTags} from '@/api/shared';

export type {Prospect} from '@/api/generated';

export type ProspectStatus = Prospect['status'];

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

const enhanced = coachApi.enhanceEndpoints({
  endpoints: {
    listProspects: {providesTags: (result) => listTags('Prospect', result, 'LIST')},
    getProspect: {providesTags: (_r, _e, arg) => [{type: 'Prospect', id: arg.id}]},
    updateProspect: {
      invalidatesTags: (_r, _e, arg) => [
        {type: 'Prospect', id: arg.id},
        {type: 'Prospect', id: 'LIST'},
      ],
    },
    enrollProspect: {
      invalidatesTags: (_r, _e, arg) => [
        {type: 'Prospect', id: arg.id},
        {type: 'Prospect', id: 'LIST'},
        {type: 'Client', id: 'LIST'},
        {type: 'Client', id: 'CLIENT-LIST'},
      ],
    },
  },
});

export const {useListProspectsQuery, useGetProspectQuery, useUpdateProspectMutation, useEnrollProspectMutation} =
  enhanced;
