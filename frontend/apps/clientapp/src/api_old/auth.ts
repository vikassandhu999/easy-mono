import axios, { AxiosInstance } from 'axios';

import { Result } from '@/lib/error';
import { z } from 'zod';

// Client auth schemas
export const SignIn_zod = z.object({
  email: z.string().email(),
});

export const SignInCode_zod = z.object({
  token_id: z.string().uuid(),
  invitation_token: z.string().uuid().optional(),
  passcode: z.string().length(6, 'Code should be 6 digits'),
});

export type SignInRequest = z.infer<typeof SignIn_zod>;
export type SignInCodeRequest = z.infer<typeof SignInCode_zod>;

export interface User {
  id: string;
  email: string;
}

export interface AccessToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: string;
  user: User;
}

export interface TokenID {
  token_id: string;
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 10000 });

export const AuthAPI = {
  // POST /c1/login - Client login (send passcode)
  signIn: async (data: SignInRequest): Promise<Result<TokenID>> => {
    try {
      const response = await client.post('/c1/login', data);
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },

  // POST /c1/token - Client token generation (verify passcode)
  signInCode: async (data: SignInCodeRequest): Promise<Result<AccessToken>> => {
    try {
      const response = await client.post('/c1/token', {
        grant_type: 'passcode',
        token_id: data.token_id,
        passcode: data.passcode,
        invitation_token: data.invitation_token,
      }, {
        withCredentials: true,
      });
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },

  // POST /c1/token - Client token refresh
  refreshToken: async (): Promise<Result<AccessToken>> => {
    try {
      const response = await client.post('/c1/token', {
        grant_type: 'refresh_token',
      }, {
        withCredentials: true
      });
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
};

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

export const setTokenForAuthedClient = (token: string) => {
  authedClient.defaults.authToken = token;
};

export const authedClient = addAuthInterceptor(axios.create(client.defaults));
