import type {FormAssignmentFilters} from './forms';
import {getSession} from './session';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => ['auth', getSession()?.id, 'profile'] as const,
  invitation: (token: string) => ['auth', 'invitation', token] as const,
};

export const formKeys = {
  all: ['forms'] as const,
  lists: () => ['forms', getSession()?.id, 'lists'] as const,
  infinite: (filters: FormAssignmentFilters) => [...formKeys.lists(), 'infinite', filters] as const,
  details: () => ['forms', getSession()?.id, 'details'] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
};
