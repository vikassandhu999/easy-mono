import {BaseQueryFn, createApi, FetchArgs, FetchBaseQueryError, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

import {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';
import {disconnectSocket} from '@/api/socket';

/**
 * Auth-only paths that should never be preserved as a post-login redirect.
 * Prevents login → verify-login loop after expired session.
 * Invite paths use dynamic segments, so they're matched by prefix below.
 */
const AUTH_PATHS = new Set(['/login', '/verify-login']);
const AUTH_PATH_PREFIXES = ['/invite/'];

function isAuthPath(pathname: string): boolean {
  if (AUTH_PATHS.has(pathname)) {
    return true;
  }
  return AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Redirect to /login with the session-expired flag and the current path
 * preserved as `redirect_to` (query param survives the hard reload, unlike
 * react-router state). The login flow restores it after re-auth.
 */
function redirectToLoginExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams({session_expired: 'true'});
  if (!isAuthPath(window.location.pathname)) {
    params.set('redirect_to', currentPath);
  }
  window.location.assign(`/login?${params.toString()}`);
}

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

const rawBaseQuery = fetchBaseQuery({
  baseUrl: baseURL,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const REFRESH_THRESHOLD_MS = 60_000;

const baseQueryWithReauth: BaseQueryFn<FetchArgs | string, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const expiresAt = getTokenExpiresAt();
  const refreshToken = getRefreshToken();
  const shouldRefresh = Boolean(expiresAt && refreshToken && expiresAt - Date.now() < REFRESH_THRESHOLD_MS);

  if (shouldRefresh) {
    const refreshResult = await rawBaseQuery(
      {
        url: '/v1/auth/token',
        method: 'POST',
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      },
      api,
      extra,
    );

    if ('data' in refreshResult && refreshResult.data) {
      setTokens(
        refreshResult.data as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        },
      );
    } else {
      const isServerError =
        'error' in refreshResult && refreshResult.error && typeof refreshResult.error.status === 'number';

      if (isServerError) {
        clearTokens();
        disconnectSocket();
        redirectToLoginExpired();
      }
      return refreshResult as {error: FetchBaseQueryError};
    }
  }

  const result = await rawBaseQuery(args, api, extra);
  if ('error' in result && result.error) {
    // Only a 401 (unauthenticated) ends the session. A 403 means the token is
    // valid but lacks permission for this resource — logging out there would
    // bounce a legitimately-signed-in user to /login.
    if (result.error.status === 401) {
      clearTokens();
      disconnectSocket();
      redirectToLoginExpired();
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'ChatMessage',
    'ClientProfile',
    'Conversation',
    'Exercise',
    'Food',
    'FormAssignment',
    'MealLog',
    'NutritionPlan',
    'PerformedSet',
    'Recipe',
    'TrainingPlan',
    'WeightEntry',
    'WorkoutSession',
  ],
  endpoints: () => ({}),
});
