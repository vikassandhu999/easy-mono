import createClient from 'openapi-fetch';
import type {paths} from './schema';
import {clearSession, getSession, saveSession} from './session';

function readError(data: unknown) {
  if (data && typeof data === 'object') {
    return data;
  }
  return {};
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly code: string | undefined;

  constructor(status: number, data: unknown) {
    const error = readError(data);
    super(
      'error_message' in error && typeof error.error_message === 'string'
        ? error.error_message
        : 'Please check the details and try again.',
    );
    this.status = status;
    this.data = data;
    this.code = 'error_code' in error && typeof error.error_code === 'string' ? error.error_code : undefined;
  }
}

export async function call<T>(request: Promise<{data?: T; error?: unknown; response: Response}>): Promise<T> {
  const {data, error, response} = await request;
  if (!response.ok) {
    throw new ApiError(response.status, error);
  }
  if (data === undefined) {
    throw new Error('The server returned an empty response. Please try again.');
  }
  return data;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
export const publicClient = createClient<paths>({baseUrl});
export const client = createClient<paths>({baseUrl});
let refreshing: Promise<ReturnType<typeof getSession>> | undefined;

export function refreshSession({role, rejectedAccessToken}: {role?: 'coach'; rejectedAccessToken?: string} = {}) {
  const refresh = async () => {
    const session = getSession();
    const rejected = session?.tokens.access_token === rejectedAccessToken;
    if (!session || (!role && !rejected && session.expiresAt - Date.now() > 60_000)) {
      return session;
    }
    try {
      const tokens = await call(
        publicClient.POST('/v1/auth/token', {
          body: {grant_type: 'refresh_token', refresh_token: session.tokens.refresh_token, ...(role ? {role} : {})},
        }),
      );
      return saveSession(tokens, session);
    } catch (error) {
      const rejected =
        error instanceof ApiError &&
        (error.status === 401 ||
          ['session_not_found', 'session_expired', 'session_revoked', 'token_invalid'].includes(error.code ?? ''));
      if (rejected && getSession()?.tokens.refresh_token === session.tokens.refresh_token) {
        clearSession();
      }
      throw error;
    }
  };
  const locked = () => (navigator.locks ? navigator.locks.request('coachapp.auth.refresh', refresh) : refresh());
  if (role || rejectedAccessToken) {
    return (refreshing ?? Promise.resolve()).then(locked);
  }
  refreshing ??= locked().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

const retryRequests = new WeakMap<Request, {request: Request; sessionId: string}>();

client.use({
  async onRequest({request}) {
    const session = await refreshSession();
    if (!session) {
      throw new Error('Please sign in to continue.');
    }
    request.headers.set('Authorization', `Bearer ${session.tokens.access_token}`);
    retryRequests.set(request, {request: request.clone(), sessionId: session.id});
    return request;
  },
  async onResponse({request, response}) {
    const retry = retryRequests.get(request);
    if ((response.status !== 401 && response.status !== 403) || !retry || getSession()?.id !== retry.sessionId) {
      return response;
    }
    // The API uses 403 for both expired credentials and insufficient permissions.
    // Refresh and retry once; an ordinary forbidden response leaves the session intact.
    const session = await refreshSession({rejectedAccessToken: request.headers.get('Authorization')?.slice(7) ?? ''});
    if (!session || session.id !== retry.sessionId) {
      throw new Error('Your session changed. Please try again.');
    }
    retry.request.headers.set('Authorization', `Bearer ${session.tokens.access_token}`);
    const result = await fetch(retry.request);
    if (result.status === 401 && getSession()?.tokens.access_token === session.tokens.access_token) {
      clearSession();
    }
    return result;
  },
});

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'We could not reach the service. Please try again shortly.';
    }
    return error.message || fallback;
  }
  return fallback;
}
