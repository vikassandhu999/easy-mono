/**
 * Centralized Environment Configuration
 *
 * This module provides a single source of truth for all environment-related
 * configuration. Import from here instead of accessing import.meta.env directly.
 *
 * Usage:
 *   import { env, config } from '@/configs/env';
 *
 *   if (env.isDev) { ... }
 *   const apiUrl = config.apiBaseUrl;
 */

/**
 * Environment flags
 */
export const env = {
    /** True if running in development mode */
    isDev: import.meta.env.DEV,

    /** True if running in production mode */
    isProd: import.meta.env.PROD,

    /** True if running in SSR mode */
    isSSR: import.meta.env.SSR,

    /** Current mode: 'development' | 'production' | 'staging' */
    mode: import.meta.env.MODE as string,

    /** App environment identifier from VITE_APP_ENV */
    appEnv: (import.meta.env.VITE_APP_ENV || import.meta.env.MODE) as 'development' | 'production' | 'staging',

    /** True if debug logging is enabled */
    isDebugEnabled:
        import.meta.env.DEV ||
        import.meta.env.VITE_DEBUG === 'true' ||
        import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
} as const;

/**
 * Resolve API base URL based on environment
 */
const resolveApiBaseUrl = (): string => {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    // In development with http://, auto-detect and replace port for local dev
    if (env.isDev && typeof window !== 'undefined' && window.origin.startsWith('http://')) {
        return window.origin.replace(':2020', ':4000');
    }

    // Use environment variable
    if (envBaseUrl) {
        return envBaseUrl;
    }

    // Fallback for development
    if (env.isDev) {
        return 'http://localhost:4000';
    }

    // Production should always have VITE_API_BASE_URL set
    console.warn('[Config] VITE_API_BASE_URL is not set in production!');
    return '';
};

/**
 * Resolve Auth API base URL (may differ from main API)
 */
const resolveAuthBaseUrl = (): string => {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    // In development with http://, auto-detect and replace port for local dev
    if (env.isDev && typeof window !== 'undefined' && window.origin.startsWith('http://')) {
        return window.origin.replace(':2020', ':8080');
    }

    // Use environment variable
    if (envBaseUrl) {
        return envBaseUrl;
    }

    // Fallback for development
    if (env.isDev) {
        return 'http://localhost:8080';
    }

    // Production should always have VITE_API_BASE_URL set
    return '';
};

/**
 * Application configuration
 */
export const config = {
    /** Main API base URL */
    apiBaseUrl: resolveApiBaseUrl(),

    /** Auth API base URL */
    authBaseUrl: resolveAuthBaseUrl(),

    /** Application name */
    appName: import.meta.env.VITE_APP_NAME || 'CoachEasy',

    /** Application short name (for PWA) */
    appShortName: import.meta.env.VITE_APP_SHORT_NAME || 'CoachEasy',

    /** PWA enabled flag */
    pwaEnabled: import.meta.env.VITE_PWA_ENABLED !== 'false',

    /** Sentry DSN for error tracking (optional) */
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,

    /** Google Analytics Measurement ID (optional) */
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || null,
} as const;

/**
 * Feature flags
 */
export const features = {
    /** Enable chat feature */
    chat: import.meta.env.VITE_FEATURE_CHAT !== 'false',

    /** Enable notifications */
    notifications: import.meta.env.VITE_FEATURE_NOTIFICATIONS !== 'false',

    /** Enable debug panel (dev only) */
    debugPanel: env.isDev,
} as const;

/**
 * Validate required configuration in production
 */
export const validateConfig = (): {valid: boolean; errors: string[]} => {
    const errors: string[] = [];

    if (env.isProd) {
        if (!import.meta.env.VITE_API_BASE_URL) {
            errors.push('VITE_API_BASE_URL is required in production');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

// Log configuration in development
if (env.isDev) {
    console.log('[Config] Environment:', env.appEnv);
    console.log('[Config] API Base URL:', config.apiBaseUrl);
    console.log('[Config] Auth Base URL:', config.authBaseUrl);
}

// Validate config on load in production
if (env.isProd) {
    const validation = validateConfig();
    if (!validation.valid) {
        console.error('[Config] Configuration errors:', validation.errors);
    }
}

export default config;
