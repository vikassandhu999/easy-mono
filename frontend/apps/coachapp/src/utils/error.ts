import {ApiErrorCode, type ApiErrorResponse, AppError} from '@easy/utils';

import type {AxiosBaseQueryError} from '@/services/baseAPISlice';

/**
 * Extracts a user-friendly error message from API errors
 * Handles AxiosBaseQueryError from RTK Query and standard API error format
 *
 * For validation errors with details, formats them as readable messages:
 * { email: ["has already been taken"] } → "email has already been taken"
 */
export function getApiErrorMessage(err: unknown): string {
    const apiError = err as AxiosBaseQueryError | undefined;

    // Check for standard API error format: { error: { message, code, details } }
    if (apiError?.data && typeof apiError.data === 'object' && 'error' in apiError.data) {
        const errorData = (apiError.data as ApiErrorResponse).error;

        // If it's a validation error with details, format them nicely
        if (errorData?.code === 'VALIDATION_ERROR' && errorData?.details) {
            const details = errorData.details as Record<string, string[]>;
            const fieldErrors = Object.entries(details)
                .map(([field, messages]) => `${field} ${messages.join(', ')}`)
                .join(', ');

            return fieldErrors || errorData.message || 'Validation failed';
        }

        if (errorData?.message) {
            return errorData.message;
        }
    }

    // Legacy: Check if error has a message property in data object
    if (apiError?.data && typeof apiError.data === 'object' && 'message' in apiError.data) {
        const message = (apiError.data as {message?: string}).message;
        if (message) return message;
    }

    // Check if data itself is a string message
    if (apiError?.data && typeof apiError.data === 'string') {
        return apiError.data;
    }

    // Check if it's an AppError instance
    if (err instanceof AppError) {
        return err.message;
    }

    // Check if it's a regular Error object
    if (err instanceof Error) {
        return err.message;
    }

    // Default fallback message
    return 'Something went wrong. Please try again.';
}

/**
 * Extracts error code from API errors
 */
export function getApiErrorCode(err: unknown): null | string {
    const apiError = err as AxiosBaseQueryError | undefined;

    // Check for standard API error format
    if (apiError?.data && typeof apiError.data === 'object' && 'error' in apiError.data) {
        const errorData = (apiError.data as ApiErrorResponse).error;
        return errorData?.code || null;
    }

    // Check if it's an AppError instance
    if (err instanceof AppError) {
        return err.code;
    }

    return null;
}

/**
 * Extracts error details from API errors
 */
export function getApiErrorDetails(err: unknown): null | Record<string, any> {
    const apiError = err as AxiosBaseQueryError | undefined;

    // Check for standard API error format
    if (apiError?.data && typeof apiError.data === 'object' && 'error' in apiError.data) {
        const errorData = (apiError.data as ApiErrorResponse).error;
        return errorData?.details || null;
    }

    // Check if it's an AppError instance
    if (err instanceof AppError) {
        return err.details || null;
    }

    return null;
}

/**
 * Converts API error to AppError instance
 */
export function parseApiError(err: unknown): AppError {
    const apiError = err as AxiosBaseQueryError | undefined;

    // Check for standard API error format
    if (apiError?.data && typeof apiError.data === 'object' && 'error' in apiError.data) {
        const errorData = (apiError.data as ApiErrorResponse).error;
        const appError = new AppError(
            errorData.message || 'An error occurred',
            errorData.code || 'UNKNOWN_ERROR',
            errorData.details || undefined,
        );

        if (apiError.status) {
            appError.withStatusCode(apiError.status);
        }

        return appError;
    }

    // Already an AppError
    if (err instanceof AppError) {
        return err;
    }

    // Regular Error
    if (err instanceof Error) {
        return new AppError(err.message, 'UNKNOWN_ERROR');
    }

    // Unknown error type
    return new AppError('Something went wrong', 'UNKNOWN_ERROR');
}

/**
 * Check if error is a specific API error code
 */
export function isErrorCode(err: unknown, code: ApiErrorCode | string): boolean {
    const errorCode = getApiErrorCode(err);
    return errorCode === code;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(err: unknown): boolean {
    const errorCode = getApiErrorCode(err);
    return [
        ApiErrorCode.INVALID_REFRESH_TOKEN,
        ApiErrorCode.INVALID_TOKEN,
        ApiErrorCode.MISSING_CREDENTIALS,
        ApiErrorCode.SESSION_NOT_FOUND,
        ApiErrorCode.TOKEN_EXPIRED,
        ApiErrorCode.UNAUTHORIZED,
    ].includes(errorCode as ApiErrorCode);
}

/**
 * Check if error is a validation error
 */
export function isValidationError(err: unknown): boolean {
    return isErrorCode(err, ApiErrorCode.VALIDATION_ERROR);
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(err: unknown): boolean {
    const errorCode = getApiErrorCode(err);
    return [ApiErrorCode.MAX_ATTEMPTS_EXCEEDED, ApiErrorCode.RATE_LIMIT_EXCEEDED].includes(errorCode as ApiErrorCode);
}

/**
 * Get validation errors from error details
 */
export function getValidationErrors(err: unknown): null | Record<string, string[]> {
    if (!isValidationError(err)) {
        return null;
    }

    const details = getApiErrorDetails(err);
    return details as null | Record<string, string[]>;
}

/**
 * Get retry after seconds from rate limit error
 */
export function getRetryAfter(err: unknown): null | number {
    if (!isRateLimitError(err)) {
        return null;
    }

    const details = getApiErrorDetails(err);
    return details?.retry_after || null;
}

/**
 * Handles API errors and displays appropriate notifications
 * Returns a user-friendly error message
 */
export function handleApiError(err: unknown, options?: {showNotification?: boolean; debugLog?: boolean}): string {
    const {showNotification = true, debugLog = true} = options || {};

    // Get user-friendly message
    const message = getApiErrorMessage(err);

    // Debug logging
    if (debugLog) {
        console.error('[API Error]', {
            message,
            code: getApiErrorCode(err),
            details: getApiErrorDetails(err),
            raw: err,
        });
    }

    // Show notification if enabled
    if (showNotification && typeof window !== 'undefined') {
        // Dynamically import notifications to avoid SSR issues
        import('@mantine/notifications').then(({notifications}) => {
            if (isRateLimitError(err)) {
                const retryAfter = getRetryAfter(err);
                notifications.show({
                    title: 'Rate Limit Exceeded',
                    message: retryAfter ? `Please try again in ${retryAfter} seconds` : message,
                    color: 'orange',
                    autoClose: 5000,
                });
            } else if (isValidationError(err)) {
                notifications.show({
                    title: 'Validation Error',
                    message,
                    color: 'red',
                });
            } else if (isAuthError(err)) {
                notifications.show({
                    title: 'Authentication Error',
                    message,
                    color: 'red',
                });
            } else {
                notifications.show({
                    title: 'Error',
                    message,
                    color: 'red',
                });
            }
        });
    }

    return message;
}
// Re-export for convenience
export {ApiErrorCode, AppError} from '@easy/utils';
