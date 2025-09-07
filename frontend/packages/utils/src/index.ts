/* eslint-disable @typescript-eslint/no-explicit-any */
import {AxiosError} from 'axios';

export const assert = function (assertion: unknown, message: string): void {
    if (!assertion) {
        throw new Error('INTERNAL ASSERT FAILED: ' + message);
    }
};

export class AppError extends Error {
    code: string;
    statusCode?: number;
    data?: unknown;
    constructor(message: string, code: string, data?: unknown) {
        super(message);
        this.code = code;
        this.data = data;
    }

    withStatusCode(code: number) {
        this.statusCode = code;
    }

    static NotFound(message: string): AppError {
        return new AppError(message, 'not_found');
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

    static failure<T>(e: AxiosError | AppError | Error | unknown): Result<T> {
        let err: AppError;
        if (e instanceof AxiosError) {
            if (e?.response?.status && e.response.status < 500) {
                err = new AppError(e.response.data.error, e.response.data.error_code);
            } else if (e?.response) {
                err = new AppError('Internal server error', 'Internal server error');
            } else if (!e.response) {
                err = new AppError('Unable to connect, please check your internet connection.', 'unknown_error');
            }
        } else if (e instanceof AppError) {
            err = e;
        } else if (e instanceof Error) {
            err = new AppError(e.message, 'unknown_error');
        } else {
            err = new AppError('Something went wrong!', 'unknown_error');
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
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
