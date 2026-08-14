import {getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

type RefreshFailure = {data: unknown; status: number};
type RefreshResult = null | RefreshFailure;

let refreshPromise: null | Promise<RefreshResult> = null;

/** Share one refresh across HTTP middleware and the Phoenix socket. */
export async function refreshTokenIfNeeded(baseURL: string, thresholdMs: number): Promise<RefreshResult> {
  const expiresAt = getTokenExpiresAt();
  const refreshToken = getRefreshToken();
  if (!expiresAt || !refreshToken || expiresAt - Date.now() >= thresholdMs) {
    return null;
  }

  refreshPromise ??= (async () => {
    const response = await fetch(`${baseURL}/v1/auth/token`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({grant_type: 'refresh_token', refresh_token: refreshToken}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {data, status: response.status};
    }
    setTokens(data);
    return null;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
