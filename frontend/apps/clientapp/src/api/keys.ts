import type {FormAssignmentFilters} from './forms';
import {getSession} from './session';
import type {SessionFilters} from './training';
import type {WeightFilters} from './weight';

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

export const attachmentKeys = {
  urls: (ids: string[]) => ['attachments', getSession()?.id, 'urls', ids] as const,
};

export const conversationKeys = {
  all: ['conversation'] as const,
  lists: () => ['conversation', getSession()?.id, 'lists'] as const,
  history: () => [...conversationKeys.lists(), 'history', 'infinite'] as const,
  detail: () => ['conversation', getSession()?.id, 'detail'] as const,
};

export const trainingKeys = {
  all: ['training'] as const,
  lists: () => ['training', getSession()?.id, 'lists'] as const,
  history: (filters: SessionFilters) => [...trainingKeys.lists(), 'history', 'infinite', filters] as const,
  details: () => ['training', getSession()?.id, 'details'] as const,
  plan: (id: string) => [...trainingKeys.details(), 'plan', id] as const,
  session: (id: string) => [...trainingKeys.details(), 'session', id] as const,
  coverage: () => ['training', getSession()?.id, 'coverage'] as const,
  active: () => ['training', getSession()?.id, 'active'] as const,
};

export const nutritionKeys = {
  all: ['nutrition'] as const,
  lists: () => ['nutrition', getSession()?.id, 'lists'] as const,
  library: (kind: 'food' | 'recipe', search: string) => [...nutritionKeys.lists(), kind, 'infinite', search] as const,
  details: () => ['nutrition', getSession()?.id, 'details'] as const,
  day: (date?: string) => [...nutritionKeys.details(), 'day', date ?? 'today'] as const,
  plan: (id: string) => [...nutritionKeys.details(), 'plan', id] as const,
};

export const weightKeys = {
  all: ['weight'] as const,
  lists: () => ['weight', getSession()?.id, 'lists'] as const,
  infinite: (filters: WeightFilters) => [...weightKeys.lists(), 'infinite', filters] as const,
  details: () => ['weight', getSession()?.id, 'details'] as const,
  day: (date: string) => [...weightKeys.details(), 'day', date] as const,
};
