/**
 * Environment-aware Logger Utility
 *
 * This logger ensures that verbose logging only occurs in development mode.
 * In production, only error and warning logs are shown.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('Debug message');      // Only in development
 *   logger.info('Info message');      // Only in development
 *   logger.warn('Warning message');   // Always shown
 *   logger.error('Error message');    // Always shown
 *   logger.debug('Debug data', data); // Only in development
 */

const isDev = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';

/**
 * Check if verbose logging should be enabled
 */
const shouldLog = (): boolean => {
    return isDev || isDebugEnabled;
};

/**
 * Format log message with timestamp and prefix
 */
const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Logger object with environment-aware methods
 */
export const logger = {
    /**
     * Log general messages (development only)
     */
    log: (message: string, ...args: unknown[]): void => {
        if (shouldLog()) {
            console.log(formatMessage('log', message), ...args);
        }
    },

    /**
     * Log informational messages (development only)
     */
    info: (message: string, ...args: unknown[]): void => {
        if (shouldLog()) {
            console.info(formatMessage('info', message), ...args);
        }
    },

    /**
     * Log debug messages with data (development only)
     */
    debug: (message: string, ...args: unknown[]): void => {
        if (shouldLog()) {
            console.debug(formatMessage('debug', message), ...args);
        }
    },

    /**
     * Log warning messages (always shown)
     */
    warn: (message: string, ...args: unknown[]): void => {
        console.warn(formatMessage('warn', message), ...args);
    },

    /**
     * Log error messages (always shown)
     */
    error: (message: string, ...args: unknown[]): void => {
        console.error(formatMessage('error', message), ...args);
    },

    /**
     * Log performance metrics (development only unless explicitly enabled)
     */
    performance: (label: string, metrics: Record<string, unknown>): void => {
        if (shouldLog()) {
            console.log(formatMessage('perf', label), metrics);
        }
    },

    /**
     * Create a grouped log (development only)
     */
    group: (label: string, fn: () => void): void => {
        if (shouldLog()) {
            console.group(formatMessage('group', label));
            fn();
            console.groupEnd();
        }
    },

    /**
     * Log a table (development only)
     */
    table: (data: unknown[], columns?: string[]): void => {
        if (shouldLog()) {
            console.table(data, columns);
        }
    },

    /**
     * Time a function execution (development only)
     */
    time: (label: string): void => {
        if (shouldLog()) {
            console.time(label);
        }
    },

    /**
     * End timing (development only)
     */
    timeEnd: (label: string): void => {
        if (shouldLog()) {
            console.timeEnd(label);
        }
    },

    /**
     * Check if logging is enabled
     */
    isEnabled: (): boolean => shouldLog(),

    /**
     * Check if running in production
     */
    isProduction: (): boolean => import.meta.env.PROD,

    /**
     * Check if running in development
     */
    isDevelopment: (): boolean => import.meta.env.DEV,
};

export default logger;
