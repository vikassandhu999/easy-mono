export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  setup: () => [...authKeys.all, 'setup'] as const,
  invitation: (token: string) => [...authKeys.all, 'invitation', token] as const,
};

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (offset: number) => [...clientKeys.lists(), {offset}] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

export const formKeys = {
  all: ['forms'] as const,
  defaultIntake: () => [...formKeys.all, 'default-intake'] as const,
  lists: () => [...formKeys.all, 'list'] as const,
  list: () => [...formKeys.lists(), 'templates'] as const,
  details: () => [...formKeys.all, 'detail'] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
  assignments: (clientId: string) => [...formKeys.lists(), {clientId}] as const,
  submissions: (assignmentId: string) => [...formKeys.lists(), 'submissions', {assignmentId}] as const,
};

export const attachmentKeys = {
  all: ['attachments'] as const,
  downloads: (ids: string[]) => [...attachmentKeys.all, 'downloads', ids] as const,
};
