/**
 * Utility functions for Content Builder
 *
 * These pure functions handle string sanitization and data cleaning.
 */

/**
 * Sanitize a string value by trimming whitespace
 * Returns undefined if the string is null, undefined, or empty after trimming
 */
export function sanitizeString(value?: null | string): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
