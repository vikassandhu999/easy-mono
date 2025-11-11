import {type BaseQueryApi, type BaseQueryFn, createApi} from '@reduxjs/toolkit/query/react';
import axios, {AxiosError, AxiosRequestConfig} from 'axios';

import {tokenRefreshManager} from './auth/tokenRefreshManager';

const resolveBaseUrl = (): string => {
    let baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined' && window.origin.startsWith('http://')) {
        baseUrl = window.origin.replace(':2020', ':4000');
    }
    return baseUrl;
};

const axiosInstance = axios.create({
    baseURL: resolveBaseUrl(),
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
        localStorage.removeItem('user');
        // Additional state clearing can be added here if needed
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
        // 3. This is an auth endpoint (send-otp, verify-otp)
        if (
            originalRequest._retry ||
            originalRequest.url?.includes('/api/auth/refresh') ||
            originalRequest.url?.includes('/api/auth/verify-otp') ||
            originalRequest.url?.includes('/api/auth/send-otp')
        ) {
            // Clear auth state and redirect to login
            tokenRefreshManager.reset();
            clearAuthState();
            redirectToLogin();
            return Promise.reject(error);
        }

        // Mark this request as retried to prevent infinite loops
        originalRequest._retry = true;

        try {
            // Use TokenRefreshManager to ensure single refresh across concurrent requests
            await tokenRefreshManager.refresh(async () => {
                await axiosInstance.post('/api/auth/refresh', {});
            });

            // Retry the original request with new token (from cookie)
            return axiosInstance(originalRequest);
        } catch (refreshError) {
            // Refresh failed - clear state and redirect
            tokenRefreshManager.reset();
            clearAuthState();
            redirectToLogin();
            return Promise.reject(refreshError);
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
        'Business', // Business preferences management
    ],
    endpoints: () => ({}),
});

export type BaseAPIQueryAPI = BaseQueryApi;
export {axiosInstance};
