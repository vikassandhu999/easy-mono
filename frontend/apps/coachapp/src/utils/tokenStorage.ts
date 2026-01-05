/**
 * Token storage utility for managing authentication tokens
 * Uses localStorage for web (consider secure storage for mobile)
 */

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const tokenStorage = {
  /**
   * Save both access and refresh tokens
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Get access token
   */
  getAccessToken(): null | string {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): null | string {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Update only the access token (used after refresh)
   */
  updateAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  /**
   * Clear all tokens (logout)
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if tokens exist
   */
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },
};
