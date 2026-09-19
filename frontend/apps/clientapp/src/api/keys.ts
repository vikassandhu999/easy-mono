import {getSession} from './session';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => ['auth', getSession()?.id, 'profile'] as const,
  invitation: (token: string) => ['auth', 'invitation', token] as const,
};
