import {BaseQueryFn, createApi, FetchArgs, FetchBaseQueryError, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

import {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

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
        redirectToLoginExpired();
      }
      return refreshResult as {error: FetchBaseQueryError};
    }
  }

  const result = await rawBaseQuery(args, api, extra);
  if ('error' in result && result.error) {
    const status = result.error.status;
    // BUG: this is also wrong as we can have insufficient permissions error as well.
    if (status === 401 || status === 403) {
      clearTokens();
      redirectToLoginExpired();
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'ClientProfile',
    'Exercise',
    'Food',
    'FormAssignment',
    'MealLog',
    'NutritionPlan',
    'PerformedSet',
    'Recipe',
    'TrainingPlan',
    'WorkoutSession',
  ],
  endpoints: () => ({}),
});
