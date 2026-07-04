type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

const AUTH_STORAGE_KEYS = {
  accessToken: 'coachapp.accessToken',
  refreshToken: 'coachapp.refreshToken',
  expiresAt: 'coachapp.expiresAt',
} as const;

export const getAccessToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);

export const getRefreshToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

export const getTokenExpiresAt = () => {
  const value = localStorage.getItem(AUTH_STORAGE_KEYS.expiresAt);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const setTokens = (tokens: AuthTokens) => {
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, tokens.access_token);
  localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, tokens.refresh_token);
  localStorage.setItem(AUTH_STORAGE_KEYS.expiresAt, String(expiresAt));
};

export const clearTokens = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.expiresAt);
};
