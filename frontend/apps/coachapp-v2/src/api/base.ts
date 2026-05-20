import {toast} from '@heroui/react';
import {BaseQueryFn, createApi, FetchArgs, FetchBaseQueryError, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

import {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

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
        toast.danger('Session expired. Please sign in again.');
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
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
      toast.danger('Session expired. Please sign in again.');
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Client',
    'CoachProfile',
    'Equipment',
    'Exercise',
    'Food',
    'Lead',
    'MealLog',
    'Meal',
    'MealItem',
    'Muscle',
    'NutritionPlan',
    'Offer',
    'PerformedSet',
    'PlanItem',
    'Recipe',
    'StoreProfile',
    'Testimonial',
    'TrainingPlan',
    'TrainingPlanItem',
    'Workout',
    'WorkoutElement',
    'WorkoutSession',
  ],
  endpoints: () => ({}),
});
