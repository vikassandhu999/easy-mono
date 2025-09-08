import {AxiosError} from 'axios';

export class AppError extends Error {
    code: string;
    constructor(message: string, code: string) {
        super(message);
        this.code = code;
    }

    static NotFound(message: string): AppError {
        return new AppError(message, 'not_found');
    }
}

export class Result<T> {
    error?: AppError;
    isError: boolean;
    value?: T;

    private constructor(isError: boolean, value?: T, error?: AppError) {
        this.isError = isError;
        this.value = value;
        this.error = error;
    }

    static failure<T>(e: AppError | AxiosError | Error | unknown): Result<T> {
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

        return new Result<T>(true, undefined, err);
    }

    static success<T>(value: T): Result<T> {
        return new Result<T>(false, value);
    }

    getError(): AppError {
        if (!this.isError) {
            throw new Error('Trying to get error of success result');
        }
        return this.error!;
    }

    getValue(): T {
        if (this.isError) {
            throw new Error('Tyring to get value of an errored result');
        }
        return this.value!;
    }
}
