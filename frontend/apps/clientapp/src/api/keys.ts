import {getSession} from './session';

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

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => ['trackers', getSession()?.id, 'lists'] as const,
  library: (search: string, archived: boolean) =>
    [...trackerKeys.lists(), 'library', 'infinite', search, archived] as const,
  entries: (id: string, from: string, to: string) =>
    [...trackerKeys.lists(), 'entries', 'infinite', id, from, to] as const,
  today: () => [...trackerKeys.lists(), 'today'] as const,
  details: () => ['trackers', getSession()?.id, 'details'] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
  metrics: (id: string, from: string, to: string) => [...trackerKeys.detail(id), 'metrics', from, to] as const,
};
