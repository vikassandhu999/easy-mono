import type {components} from './schema.ts';
export type AuthTokens = components['schemas']['AuthTokenResponse'];
export type Session = {id: string; expiresAt: number; tokens: AuthTokens};
export function parseSession(raw: string | null): Session | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || !('id' in value) || !('expiresAt' in value) || !('tokens' in value)) {
      return null;
    }
    const tokens = value.tokens;
    if (
      typeof value.id !== 'string' ||
      !value.id ||
      typeof value.expiresAt !== 'number' ||
      !Number.isFinite(value.expiresAt) ||
      !tokens ||
      typeof tokens !== 'object' ||
      !('access_token' in tokens) ||
      typeof tokens.access_token !== 'string' ||
      !tokens.access_token ||
      !('refresh_token' in tokens) ||
      typeof tokens.refresh_token !== 'string' ||
      !tokens.refresh_token ||
      !('scope' in tokens) ||
      tokens.scope !== 'client' ||
      !('expires_in' in tokens) ||
      typeof tokens.expires_in !== 'number' ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      !('token_type' in tokens) ||
      tokens.token_type !== 'Bearer'
    ) {
      return null;
    }
    return {
      id: value.id,
      expiresAt: value.expiresAt,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
      },
    };
  } catch {
    return null;
  }
}
