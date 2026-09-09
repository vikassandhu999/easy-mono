import type {VerifyRequest} from '../api/auth';

export type Challenge = Pick<VerifyRequest, 'email'> & {sentAt: number} & (
    | {kind: 'login' | 'signup'}
    | {kind: 'invite'; token: string}
  );
const KEY = 'coachapp.challenge.v1';

export function getChallenge(): Challenge | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (
      !value ||
      typeof value !== 'object' ||
      !('email' in value) ||
      typeof value.email !== 'string' ||
      !value.email ||
      !('sentAt' in value) ||
      typeof value.sentAt !== 'number' ||
      !Number.isFinite(value.sentAt) ||
      !('kind' in value)
    ) {
      return null;
    }
    const base = {email: value.email, sentAt: value.sentAt};
    if (value.kind === 'login' || value.kind === 'signup') {
      return {...base, kind: value.kind};
    }
    if (value.kind === 'invite' && 'token' in value && typeof value.token === 'string' && value.token) {
      return {...base, kind: value.kind, token: value.token};
    }
    return null;
  } catch {
    return null;
  }
}

export function saveChallenge(challenge: Challenge) {
  sessionStorage.setItem(KEY, JSON.stringify(challenge));
}
