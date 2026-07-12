import {toast} from '@heroui/react';
import {BaseQueryFn, createApi, FetchArgs, FetchBaseQueryError, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

import {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';
import {disconnectSocket} from '@/api/socket';

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

const forceLogout = () => {
  clearTokens();
  disconnectSocket();
  toast.danger('Session expired. Please sign in again.');
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
};

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
        forceLogout();
      }
      return refreshResult as {error: FetchBaseQueryError};
    }
  }

  const result = await rawBaseQuery(args, api, extra);
  if ('error' in result && result.error) {
    // Only a 401 (unauthenticated) ends the session. A 403 means the token is
    // valid but lacks permission for this resource (e.g. a guest-scoped token
    // hitting a coach-only route during onboarding) — logging out there would
    // bounce a legitimately-signed-in user to /login.
    if (result.error.status === 401) {
      forceLogout();
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Billing',
    'ChatMessage',
    'Client',
    'ClientProfile',
    'CoachProfile',
    'Conversation',
    'Equipment',
    'Exercise',
    'Food',
    'FormAssignment',
    'CheckInSchedule',
    'CheckInReview',
    'FormSubmission',
    'FormTemplate',
    'LandingPage',
    'MealLog',
    'Meal',
    'MealItem',
    'Muscle',
    'NutritionPlan',
    'PlanItem',
    'Prospect',
    'Recipe',
    'Team',
    'TrainingExercise',
    'TrainingPlan',
    'TrainingPlanItem',
    'TrainingSession',
    'Workout',
    'WorkoutElement',
  ],
  endpoints: () => ({}),
});
