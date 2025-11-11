/* eslint-disable @typescript-eslint/no-explicit-any */
import {AxiosError} from 'axios';

export const assert = function (assertion: unknown, message: string): void {
    if (!assertion) {
        throw new Error('INTERNAL ASSERT FAILED: ' + message);
    }
};

/**
 * API Error Response structure from backend
 */
export interface ApiErrorResponse {
    error: {
        message: string;
        code: string;
        details?: null | Record<string, any>;
    };
}

/**
 * Known API error codes from backend
 */
export enum ApiErrorCode {
    ALREADY_ASSIGNED = 'ALREADY_ASSIGNED',

    ALREADY_EXISTS = 'ALREADY_EXISTS',
    BAD_REQUEST = 'BAD_REQUEST',
    // Business Logic
    BUSINESS_EXISTS = 'BUSINESS_EXISTS',
    CONFLICT = 'CONFLICT',
    FORBIDDEN = 'FORBIDDEN',
    // Server Errors
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    // Authentication Errors
    INVALID_OTP = 'INVALID_OTP',

    INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',

    INVALID_TOKEN = 'INVALID_TOKEN',
    INVALID_TOKEN_TYPE = 'INVALID_TOKEN_TYPE',

    INVITATION_EXPIRED = 'INVITATION_EXPIRED',
    INVITATION_USED = 'INVITATION_USED',

    LOGOUT_FAILED = 'LOGOUT_FAILED',
    MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
    METADATA_VALIDATION_FAILED = 'METADATA_VALIDATION_FAILED',
    MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
    // Resource Errors
    NOT_FOUND = 'NOT_FOUND',
    // Operation Errors
    OTP_GENERATION_FAILED = 'OTP_GENERATION_FAILED',

    OTP_VERIFICATION_FAILED = 'OTP_VERIFICATION_FAILED',
    // Rate Limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    REFRESH_FAILED = 'REFRESH_FAILED',
    REGISTRATION_ERROR = 'REGISTRATION_ERROR',

    // Session Errors
    SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
    TOKEN_USED = 'TOKEN_USED',
    // Authorization
    UNAUTHORIZED = 'UNAUTHORIZED',

    UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    // Validation Errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
    code: string;
    statusCode?: number;
    details?: Record<string, any>;

    constructor(message: string, code: string, details?: Record<string, any>) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }

    withStatusCode(code: number): AppError {
        this.statusCode = code;
        return this;
    }

    static NotFound(message: string): AppError {
        return new AppError(message, ApiErrorCode.NOT_FOUND);
    }

    /**
     * Parse API error from Axios error response
     */
    static fromAxiosError(error: AxiosError<ApiErrorResponse>): AppError {
        const status = error.response?.status;
        const data = error.response?.data;

        // Check if response has the standard API error format
        if (data?.error) {
            const appError = new AppError(data.error.message, data.error.code, data.error.details || undefined);
            if (status) {
                appError.withStatusCode(status);
            }
            return appError;
        }

        // Fallback for non-standard error responses
        if (status && status < 500) {
            return new AppError(error.message || 'Request failed', 'REQUEST_FAILED').withStatusCode(status);
        }

        if (status && status >= 500) {
            return new AppError('Internal server error', ApiErrorCode.INTERNAL_ERROR).withStatusCode(status);
        }

        // Network error
        return new AppError('Unable to connect, please check your internet connection.', 'NETWORK_ERROR');
    }

    /**
     * Check if error is a specific API error code
     */
    isCode(code: ApiErrorCode | string): boolean {
        return this.code === code;
    }

    /**
     * Check if error is an authentication error
     */
    isAuthError(): boolean {
        return [
            ApiErrorCode.INVALID_REFRESH_TOKEN,
            ApiErrorCode.INVALID_TOKEN,
            ApiErrorCode.MISSING_CREDENTIALS,
            ApiErrorCode.SESSION_NOT_FOUND,
            ApiErrorCode.TOKEN_EXPIRED,
            ApiErrorCode.UNAUTHORIZED,
        ].includes(this.code as ApiErrorCode);
    }

    /**
     * Check if error is a validation error
     */
    isValidationError(): boolean {
        return this.code === ApiErrorCode.VALIDATION_ERROR;
    }

    /**
     * Check if error is a rate limit error
     */
    isRateLimitError(): boolean {
        return [ApiErrorCode.MAX_ATTEMPTS_EXCEEDED, ApiErrorCode.RATE_LIMIT_EXCEEDED].includes(
            this.code as ApiErrorCode,
        );
    }

    /**
     * Get retry after seconds from rate limit error details
     */
    getRetryAfter(): null | number {
        if (this.isRateLimitError() && this.details?.retry_after) {
            return this.details.retry_after;
        }
        return null;
    }

    /**
     * Get validation errors from details
     */
    getValidationErrors(): null | Record<string, string[]> {
        if (this.isValidationError() && this.details) {
            return this.details as Record<string, string[]>;
        }
        return null;
    }
}

export class Result<T> {
    isError: boolean;
    value?: T;
    error?: AppError;

    private constructor(isError: boolean, value?: T, error?: AppError) {
        this.isError = isError;
        this.value = value;
        this.error = error;
    }

    getValue(): T {
        if (this.isError) {
            throw this.error;
        }
        return this.value!;
    }

    getError(): AppError {
        return this.error!;
    }

    static success<T>(value: T): Result<T> {
        return new Result<T>(false, value);
    }

    static failure<T>(e: AppError | AxiosError | Error | unknown): Result<T> {
        let err: AppError;

        if (e instanceof AxiosError) {
            err = AppError.fromAxiosError(e);
        } else if (e instanceof AppError) {
            err = e;
        } else if (e instanceof Error) {
            err = new AppError(e.message, 'UNKNOWN_ERROR');
        } else {
            err = new AppError('Something went wrong!', 'UNKNOWN_ERROR');
        }

        return new Result<T>(true, undefined, err);
    }
}

export * from './format-start-end';

export const withThrottling =
    ({wait, leading, trailing}: {wait: number; leading?: boolean; trailing?: boolean}) =>
    <TFunction extends (...args: any[]) => any>(fn: TFunction) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let result: ReturnType<TFunction>;
        let previous = 0;

        function throttled(this: ThisParameterType<TFunction>, ...args: Parameters<TFunction>) {
            const now = Date.now();
            if (!previous && leading === false) previous = now;
            const remaining = wait - (now - previous);

            if (remaining <= 0 || remaining > wait) {
                if (timer) clearTimeout(timer);
                timer = undefined;
                previous = now;
                result = fn.apply(this, args);
            } else if (!timer && trailing !== false) {
                const later = () => {
                    previous = leading === false ? 0 : Date.now();
                    result = fn.apply(this, args);
                    timer = undefined;
                };
                timer = setTimeout(later, remaining);
            }
            return result;
        }

        const cancel = () => {
            if (timer) clearTimeout(timer);
            previous = 0;
            timer = undefined;
        };

        return Object.assign(throttled, {cancel});
    };

export const withDebouncing =
    ({wait, immediate}: {wait: number; immediate?: boolean}) =>
    <TFunction extends (...args: any[]) => any>(fn: TFunction) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let result: ReturnType<TFunction>;
        let previous: number;

        function debounced(this: ThisParameterType<TFunction>, ...args: Parameters<TFunction>) {
            previous = Date.now();
            if (!timer) {
                const later = () => {
                    const passed = Date.now() - previous;
                    if (wait > passed) {
                        timer = setTimeout(later, wait - passed);
                    } else {
                        timer = undefined;
                        if (!immediate) result = fn.apply(this, args);
                    }
                };
                timer = setTimeout(later, wait);
                if (immediate) result = fn.apply(this, args);
            }
            return result;
        }

        const cancel = () => {
            clearTimeout(timer);
            timer = undefined;
        };

        return Object.assign(debounced, {cancel});
    };
