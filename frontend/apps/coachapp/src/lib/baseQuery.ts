import {BaseQueryFn} from '@reduxjs/toolkit/query';
import {AxiosError, AxiosRequestConfig} from 'axios';

import {authClient, client, getBaseURL} from '@/lib/client';

export interface BaseQueryArgs {
    data?: AxiosRequestConfig['data'];
    headers?: AxiosRequestConfig['headers'];
    method?: AxiosRequestConfig['method'];
    params?: AxiosRequestConfig['params'];
    skipAuth?: boolean;
    timeout?: number;
    url: string;
}

export interface BaseQueryError {
    data: any;
    message?: string;
    status: number;
}

/**
 * Enhanced axios base query for RTK Query with authentication support
 */
export const axiosBaseQuery = ({
    baseUrl = '',
    requiresAuth = false,
}: {
    baseUrl?: string;
    requiresAuth?: boolean;
} = {}): BaseQueryFn<BaseQueryArgs, unknown, BaseQueryError> => {
    return async ({url, method = 'GET', data, params, headers, skipAuth, timeout}) => {
        try {
            // Choose the appropriate client based on auth requirements
            const selectedClient = !skipAuth && requiresAuth ? authClient : client;

            // Only include credentials for authenticated requests (not for skipAuth requests)
            const includeCredentials = !skipAuth;

            // Build the request config
            const config: AxiosRequestConfig = {
                url: baseUrl + url,
                method,
                data,
                params,
                headers: {
                    ...headers,
                    ...(skipAuth && {skipAuth: true}), // Custom header to skip auth interceptor
                },
                withCredentials: includeCredentials,
                timeout: timeout || 30000, // 30 second default timeout
            };

            const result = await selectedClient(config);

            return {
                data: result.data,
                meta: {
                    request: result.request,
                    response: result,
                    timestamp: Date.now(),
                },
            };
        } catch (axiosError) {
            const err = axiosError as AxiosError;

            // Enhanced error handling
            const errorResponse: BaseQueryError = {
                status: err.response?.status || 500,
                data: err.response?.data || {
                    message: err.message || 'An unknown error occurred',
                    code: err.code,
                },
                message: err.message,
            };

            // Log errors in development
            if (import.meta.env.DEV) {
                console.error('RTK Query Error:', {
                    url: baseUrl + url,
                    method,
                    error: errorResponse,
                    originalError: err,
                });
            }

            return {error: errorResponse};
        }
    };
};

export const authenticatedBaseQuery = axiosBaseQuery({
    baseUrl: getBaseURL(),
    requiresAuth: true,
});

export const publicBaseQuery = axiosBaseQuery({
    baseUrl: getBaseURL(),
    requiresAuth: false,
});

export const tagTypes = [
    'User',
    'Auth',
    'Client',
    'Program',
    'Session',
    'Goal',
    'Note',
    'Message',
    'Notification',
    'Dashboard',
    'Analytics',
] as const;

export type TagType = (typeof tagTypes)[number];

export const commonQueryConfig = {
    keepUnusedDataFor: 5 * 60,
    refetchOnReconnect: true,
    refetchOnFocus: !import.meta.env.DEV,
    retry: (failureCount: number, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
            return false;
        }
        return failureCount < 3;
    },
};
