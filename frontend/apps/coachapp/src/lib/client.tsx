import axios, {AxiosInstance} from 'axios';

import {AuthAPI} from '@/api/auth';

export const getBaseURL = () => {
    let baseURL: string = import.meta.env.VITE_API_BASE_URL;

    if (window.origin.startsWith('https://')) {
        baseURL = window.origin.replace(':2020', ':8080');
    }
    return baseURL;
};

export const client = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

const addAuthInterceptor = (instance: AxiosInstance) => {
    instance.interceptors.request.use((config) => {
        if (instance.defaults.authToken && config.headers && !config.skipAuth) {
            config.headers.Authorization = `Bearer ${instance.defaults.authToken}`;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    const authToken = await AuthAPI.refreshToken();
                    instance.defaults.authToken = authToken.getValue().access_token;
                } catch (e) {
                    return Promise.reject(error);
                }
                originalRequest.headers.Authorization = `Bearer ${instance.defaults.authToken}`;
                return axios(originalRequest);
            }
            return Promise.reject(error);
        },
    );
    return instance;
};

export const authClient = addAuthInterceptor(client);
