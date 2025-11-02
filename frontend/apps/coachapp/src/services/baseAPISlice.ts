import {type BaseQueryApi, type BaseQueryFn, createApi} from '@reduxjs/toolkit/query/react';
import axios, {AxiosError, AxiosRequestConfig} from 'axios';

const resolveBaseUrl = (): string => {
    let baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined' && window.origin.startsWith('http://')) {
        baseUrl = window.origin.replace(':2020', ':8080');
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

let currentAuthToken: null | string = null;

export const setApiAuthToken = (token?: null | string) => {
    currentAuthToken = token ?? null;
};

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
    skipAuth?: boolean;
    url: string;
};

const axiosBaseQuery = (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> => {
    return async ({url, method = 'get', data, params, headers, skipAuth}, {signal}) => {
        try {
            const requestHeaders: Record<string, string | undefined> = {};

            if (headers && typeof headers === 'object') {
                Object.assign(requestHeaders, headers as Record<string, string | undefined>);
            }

            if (!skipAuth && currentAuthToken) {
                requestHeaders.Authorization = `Bearer ${currentAuthToken}`;
            }

            if (skipAuth) {
                requestHeaders.Authorization = undefined;
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
