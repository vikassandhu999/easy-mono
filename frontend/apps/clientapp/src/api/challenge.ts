import {readStored, removeStored, writeStored} from './storage';

export type Challenge = {email: string; sentAt: number} & ({kind: 'login'} | {kind: 'invite'; token: string});
const KEY = 'clientapp.challenge.v1';
let challenge: Challenge | null = null;

export async function restoreChallenge() {
  try {
    const value: unknown = JSON.parse((await readStored(KEY)) ?? 'null');
    if (
      !value ||
      typeof value !== 'object' ||
      !('email' in value) ||
      typeof value.email !== 'string' ||
      !value.email ||
      !('sentAt' in value) ||
      typeof value.sentAt !== 'number' ||
      !Number.isFinite(value.sentAt) ||
      !('kind' in value) ||
      Date.now() - value.sentAt > 86_400_000
    ) {
      return;
    }
    const base = {email: value.email, sentAt: value.sentAt};
    if (value.kind === 'login') {
      challenge = {...base, kind: 'login'};
    } else if (value.kind === 'invite' && 'token' in value && typeof value.token === 'string' && value.token) {
      challenge = {...base, kind: 'invite', token: value.token};
    }
  } catch {
    challenge = null;
  }
}

export function getChallenge() {
  return challenge;
}

export async function clearChallenge() {
  challenge = null;
  await removeStored(KEY);
}

export async function saveChallenge(value: Challenge) {
  await writeStored(KEY, JSON.stringify(value));
  challenge = value;
}
