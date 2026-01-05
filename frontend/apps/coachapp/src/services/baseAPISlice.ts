import {type BaseQueryApi, type BaseQueryFn, createApi} from '@reduxjs/toolkit/query/react';
import axios, {AxiosError, AxiosRequestConfig} from 'axios';

import {tokenStorage} from '@/slices/authSlice';
import {logger} from '@/utils/logger';

/**
 * Resolve the API base URL based on environment
 * - In production: Uses VITE_API_BASE_URL
 * - In development: Auto-detects local dev server and adjusts port
 */
const resolveBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // In development with http://, auto-detect and replace port for local dev
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.origin.startsWith('http://')) {
    return window.origin.replace(':2020', ':4000');
  }

  // Use environment variable (required in production)
  if (!envBaseUrl) {
    logger.warn('VITE_API_BASE_URL is not set, using default');
    return 'http://localhost:4000';
  }

  return envBaseUrl;
};

const BASE_URL = resolveBaseUrl();

logger.log('API Base URL configured', {url: BASE_URL, env: import.meta.env.VITE_APP_ENV || 'unknown'});

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Clears authentication state from localStorage and application state
 */
function clearAuthState() {
  if (typeof window !== 'undefined') {
    tokenStorage.clearTokens();
    localStorage.removeItem('user');
  }
}

/**
 * Redirects the user to the login page
 * Only redirects if not already on an auth page to prevent infinite loops
 */
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const authPages = ['/login', '/register', '/verify'];

    // Don't redirect if already on an auth page
    if (!authPages.includes(currentPath)) {
      window.location.href = '/login';
    }
  }
}

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: unknown) => void; reject: (reason?: any) => void}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// Add request interceptor to attach access token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't retry if:
    // 1. Already retried this request
    // 2. This IS the refresh endpoint
    // 3. This is an auth endpoint (token, send-login-code, verify, etc.)
    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/api/auth/token') ||
      originalRequest.url?.includes('/api/auth/send-login-code') ||
      originalRequest.url?.includes('/api/auth/verify') ||
      originalRequest.url?.includes('/api/auth/register')
    ) {
      // Clear auth state and redirect to login
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }

    // Mark this request as retried to prevent infinite loops
    originalRequest._retry = true;

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({resolve, reject});
      })
        .then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const response = await axiosInstance.post('/api/auth/token', {
        refresh_token: refreshToken,
      });

      const {access_token, refresh_token: new_refresh_token} = response.data;

      // Save new tokens
      tokenStorage.setTokens(access_token, new_refresh_token);

      logger.debug('Token refreshed successfully');

      // Process queued requests
      processQueue(null);

      // Retry the original request with new token
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed - clear state and redirect
      logger.error('Token refresh failed', refreshError);
      processQueue(refreshError);
      clearAuthState();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export type AxiosBaseQueryError = {
  data?: unknown;
  message: string;
  status?: number;
};

type AxiosBaseQueryArgs = {
  data?: AxiosRequestConfig['data'];
  headers?: AxiosRequestConfig['headers'];
  method?: AxiosRequestConfig['method'];
  params?: AxiosRequestConfig['params'];
  url: string;
};

const axiosBaseQuery = (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> => {
  return async ({url, method = 'get', data, params, headers}, {signal}) => {
    try {
      const requestHeaders: Record<string, string | undefined> = {};

      // Add authorization header with access token
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`;
      }

      // Merge with any custom headers
      if (headers && typeof headers === 'object') {
        Object.assign(requestHeaders, headers as Record<string, string | undefined>);
      }

      const result = await axiosInstance.request({
        url,
        method,
        data,
        params,
        headers: requestHeaders,
        signal,
      });
      return {data: result.data};
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
        },
      };
    }
  };
};

export const baseAPISlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Clients',
    'MembershipStats',
    'Chats',
    'ChatMessages',
    'Contents',
    'Schedules',
    'ScheduleEntries',
    'Sessions',
    'Plans',
    'PlanSessions',
    'Coach', // Coach profile management
    'Profile', // User profile (auth/me endpoint)
    'Business', // Business preferences management
    'BusinessSettings', // Business settings (public join, branding)
    'Recipes', // Recipe management
    'Ingredients', // Ingredient management
    'NutritionPlans', // Nutrition Plan management
    'Meals', // Meal management
    'MealItems', // Meal Items management
    'TrainingPlans', // Training Plan management
    'Exercises', // Exercise management
    'Muscles', // Muscle management
    'Equipment', // Equipment management
    'WorkoutSessions', // Workout session tracking
    'PerformedSets', // Performed set logging
  ],
  endpoints: () => ({}),
});

export type BaseAPIQueryAPI = BaseQueryApi;
export {axiosInstance, BASE_URL};
