import {getSession} from './session';
import type {SessionFilters} from './training';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => ['auth', getSession()?.id, 'profile'] as const,
  invitation: (token: string) => ['auth', 'invitation', token] as const,
};

export const attachmentKeys = {
  urls: (ids: string[]) => ['attachments', getSession()?.id, 'urls', ids] as const,
};

export const conversationKeys = {
  all: ['conversation'] as const,
  lists: () => ['conversation', getSession()?.id, 'lists'] as const,
  history: () => [...conversationKeys.lists(), 'history', 'infinite'] as const,
  reviewReplies: (reviewId: string | null) =>
    [...conversationKeys.lists(), 'review-replies', 'infinite', reviewId] as const,
  detail: () => ['conversation', getSession()?.id, 'detail'] as const,
};

export const trainingKeys = {
  all: ['training'] as const,
  lists: () => ['training', getSession()?.id, 'lists'] as const,
  history: (filters: SessionFilters) => [...trainingKeys.lists(), 'history', 'infinite', filters] as const,
  details: () => ['training', getSession()?.id, 'details'] as const,
  plan: (id: string) => [...trainingKeys.details(), 'plan', id] as const,
  session: (id: string) => [...trainingKeys.details(), 'session', id] as const,
  occurrences: (from: string, to: string) => [...trainingKeys.lists(), 'occurrences', from, to] as const,
  coverage: () => ['training', getSession()?.id, 'coverage'] as const,
  active: () => ['training', getSession()?.id, 'active'] as const,
};

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => ['trackers', getSession()?.id, 'lists'] as const,
  library: (search: string, archived: boolean) =>
    [...trackerKeys.lists(), 'library', 'infinite', search, archived] as const,
  entries: (id: string, from: string, to: string) =>
    [...trackerKeys.lists(), 'entries', 'infinite', id, from, to] as const,
  today: () => [...trackerKeys.lists(), 'today'] as const,
  prompts: (event: object) => [...trackerKeys.lists(), 'prompts', event] as const,
  details: () => ['trackers', getSession()?.id, 'details'] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
  metrics: (id: string, from: string, to: string) => [...trackerKeys.detail(id), 'metrics', from, to] as const,
};
