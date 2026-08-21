import {toast} from '@heroui/react';
import createClient, {type Middleware} from 'openapi-fetch';

import {clearTokens, getAccessToken} from '@/api/authStorage';
import {ApiError} from '@/api/api-error';
import type {paths} from '@/api/schema';
import {refreshTokenIfNeeded} from '@/api/token-refresh';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

if (window.location.hostname.startsWith('192.168.')) {
  // If we're running on a local network, use the local IP for API requests to avoid CORS issues with localhost
  const localIP = window.location.hostname;
  baseURL = `http://${localIP}:4000`;
}

// A deployed (non-local) origin with no VITE_API_BASE_URL means every request silently
// targets localhost and fails. Make that loud instead of a mysterious "spins then fails".
if (!import.meta.env.VITE_API_BASE_URL && !/^(localhost|127\.0\.0\.1|192\.168\.)/.test(window.location.hostname)) {
  console.error(
    '[config] VITE_API_BASE_URL is not set but the app is served from a non-local origin — ' +
      `API calls target ${baseURL} and will fail. Set VITE_API_BASE_URL at build time (see .env.example).`,
  );
}

const REFRESH_THRESHOLD_MS = 60_000;

const forceLogout = () => {
  clearTokens();
  toast.danger('Session expired. Please sign in again.');
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
};

/** Refresh the access token when it's about to expire. Shared promise so concurrent requests refresh once. */
async function refreshIfNeeded(): Promise<void> {
  const failure = await refreshTokenIfNeeded(baseURL, REFRESH_THRESHOLD_MS);
  if (failure) {
    // The server rejected the refresh token — the session is over. A network
    // failure (fetch throws) is NOT a logout; the original request just fails.
    forceLogout();
    throw new ApiError(failure.status, failure.data);
  }
}

const authMiddleware: Middleware = {
  async onRequest({request}) {
    await refreshIfNeeded();
    const token = getAccessToken();
    if (token) {
      request.headers.set('authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({response}) {
    // Only a 401 (unauthenticated) ends the session. A 403 means the token is
    // valid but lacks permission for this resource (e.g. a guest-scoped token
    // hitting a coach-only route during onboarding) — logging out there would
    // bounce a legitimately-signed-in user to /login.
    if (response.status === 401) {
      forceLogout();
    }
    return response;
  },
};

export const client = createClient<paths>({baseUrl: baseURL});
client.use(authMiddleware);

/**
 * Unwrap an openapi-fetch result for use as a React Query queryFn/mutationFn:
 * returns `data` on success, throws `ApiError` on a non-2xx response.
 */
export {ApiError} from '@/api/api-error';
export async function call<T, E>(promise: Promise<{data?: T; error?: E; response: Response}>): Promise<T> {
  const {data, error, response} = await promise;
  if (error !== undefined) {
    throw new ApiError(response.status, error);
  }
  return data as T;
}
