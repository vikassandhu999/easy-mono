import {toast} from '@heroui/react';
import {BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError} from '@reduxjs/toolkit/query/react';

import {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:4000',
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
      clearTokens();
      toast.danger('Session expired. Please sign in again.');
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
      return refreshResult as {error: FetchBaseQueryError};
    }
  }

  const result = await rawBaseQuery(args, api, extra);
  if ('error' in result && result.error) {
    const status = result.error.status;
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
  endpoints: () => ({}),
});
